"""
SURAKSHA — Idempotent Seed Loaders for Odisha Cyclone Domain Data
Loads:
1. Odisha administrative blocks (odisha_blocks.geojson + block_population.csv) -> `areas`
2. Strategic civil & defense infrastructure (strategic_assets.csv) -> `strategic_assets`

Grounded strictly in M4 source datasets (PR #12).
Enforces:
- Idempotent upsert (zero duplicate rows on repeated executions).
- Strict geometry and coordinate validation (Odisha bounds [17.5N-23.0N, 81.0E-88.0E]).
- Population integrity checks (vulnerable <= total).
- Transparent error reporting (no silent dropping).
"""
import csv
import json
import logging
import math
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session

from backend.app.models.cyclone import Area, StrategicAsset

logger = logging.getLogger(__name__)

# Bounding box for Odisha geographic coverage per sources.md
ODISHA_LAT_MIN = 17.5
ODISHA_LAT_MAX = 23.0
ODISHA_LON_MIN = 81.0
ODISHA_LON_MAX = 88.0


@dataclass
class SeedResult:
    """Structured report of a seed loading operation."""
    table: str
    loaded: int = 0
    updated: int = 0
    skipped: int = 0
    errors: List[str] = field(default_factory=list)

    @property
    def total_processed(self) -> int:
        return self.loaded + self.updated + self.skipped


def geojson_to_multipolygon_wkt(geom: dict) -> str:
    """
    Convert a GeoJSON Polygon or MultiPolygon dict to a PostGIS MULTIPOLYGON WKT string.
    Ensures single Polygons are cleanly wrapped in MultiPolygon representation.
    """
    g_type = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if g_type == "Polygon":
        polygons = [coords]
    elif g_type == "MultiPolygon":
        polygons = coords
    else:
        raise ValueError(f"Unsupported geometry type '{g_type}' for block area")

    poly_strings = []
    for poly in polygons:
        ring_strings = []
        for ring in poly:
            pt_strings = [f"{pt[0]} {pt[1]}" for pt in ring]
            ring_strings.append(f"({', '.join(pt_strings)})")
        poly_strings.append(f"({', '.join(ring_strings)})")

    return f"MULTIPOLYGON({', '.join(poly_strings)})"


def validate_coordinates(lat: float, lon: float, identifier: str) -> None:
    """Validate latitude and longitude values and verify they lie within Odisha bounds."""
    if lat is None or lon is None or math.isnan(lat) or math.isnan(lon):
        raise ValueError(f"Record '{identifier}': coordinates contain NaN or None")
    if not (ODISHA_LAT_MIN <= lat <= ODISHA_LAT_MAX):
        raise ValueError(
            f"Record '{identifier}': latitude {lat} outside Odisha bounds [{ODISHA_LAT_MIN}, {ODISHA_LAT_MAX}]"
        )
    if not (ODISHA_LON_MIN <= lon <= ODISHA_LON_MAX):
        raise ValueError(
            f"Record '{identifier}': longitude {lon} outside Odisha bounds [{ODISHA_LON_MIN}, {ODISHA_LON_MAX}]"
        )


def validate_polygon_geometry(geom: dict, area_code: str) -> None:
    """Validate that polygon coordinates form closed rings and lie within expected bounds."""
    g_type = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if g_type not in ("Polygon", "MultiPolygon") or not coords:
        raise ValueError(f"Area '{area_code}': invalid geometry type '{g_type}' or empty coordinates")

    polygons = [coords] if g_type == "Polygon" else coords
    for poly in polygons:
        for ring in poly:
            if len(ring) < 4:
                raise ValueError(f"Area '{area_code}': polygon ring must have at least 4 coordinates")
            # Closed ring check
            if ring[0] != ring[-1]:
                raise ValueError(f"Area '{area_code}': polygon ring is not closed (first != last)")
            # Vertex bounds check
            for pt in ring:
                lon, lat = pt[0], pt[1]
                validate_coordinates(lat, lon, area_code)


def validate_population(total: int, vulnerable: int, area_code: str) -> None:
    """Validate population numbers are non-negative and vulnerable does not exceed total."""
    if total < 0:
        raise ValueError(f"Area '{area_code}': total_population cannot be negative ({total})")
    if vulnerable < 0:
        raise ValueError(f"Area '{area_code}': vulnerable_population cannot be negative ({vulnerable})")
    if vulnerable > total:
        raise ValueError(
            f"Area '{area_code}': vulnerable_population ({vulnerable}) exceeds total_population ({total})"
        )


def resolve_default_data_dir(custom_dir: Optional[Union[str, Path]] = None) -> Path:
    """Locate the seed data directory containing block_population.csv and odisha_blocks.geojson."""
    if custom_dir:
        p = Path(custom_dir)
        if p.exists():
            return p

    candidates = [
        Path("db/seed/data"),
        Path("db/seed"),
        Path("/app/db/seed/data"),
        Path("/app/db/seed"),
        Path(__file__).resolve().parent.parent.parent.parent / "db" / "seed" / "data",
    ]
    for c in candidates:
        if c.exists() and (c / "odisha_blocks.geojson").exists():
            return c

    # Fallback to current working directory
    return Path("db/seed/data")


def load_blocks(
    session: Session,
    geojson_path: Union[str, Path],
    csv_path: Union[str, Path],
    commit: bool = True,
) -> SeedResult:
    """
    Load administrative blocks from GeoJSON and CSV population data into `areas`.
    Idempotent: updates existing blocks on match of natural primary key `area_code`.
    """
    result = SeedResult(table="areas")
    geojson_path = Path(geojson_path)
    csv_path = Path(csv_path)

    if not geojson_path.exists():
        result.errors.append(f"GeoJSON file not found: {geojson_path}")
        return result
    if not csv_path.exists():
        result.errors.append(f"CSV file not found: {csv_path}")
        return result

    # 1. Parse population CSV indexed by area_code
    pop_data: Dict[str, dict] = {}
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            ac = (row.get("area_code") or "").strip()
            if not ac:
                result.errors.append(f"CSV line {row_idx}: missing area_code")
                continue
            pop_data[ac] = row

    # 2. Parse GeoJSON features
    with open(geojson_path, mode="r", encoding="utf-8") as f:
        geojson_doc = json.load(f)

    features = geojson_doc.get("features", [])
    if not features:
        result.errors.append(f"GeoJSON file {geojson_path} contains no features")
        return result

    for feat_idx, feat in enumerate(features, start=1):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        area_code = (props.get("area_code") or "").strip()

        if not area_code:
            result.errors.append(f"Feature #{feat_idx}: missing properties.area_code")
            result.skipped += 1
            continue

        try:
            # Validate geometry
            validate_polygon_geometry(geom, area_code)
            wkt_geom = geojson_to_multipolygon_wkt(geom)

            # Match population record from CSV
            pop_row = pop_data.get(area_code, {})
            block_name = (pop_row.get("block_name") or props.get("block_name") or "").strip()
            district = (pop_row.get("district") or props.get("district") or "").strip()
            lgd_code = str(pop_row.get("lgd_code") or props.get("lgd_code") or "")

            if not block_name or not district:
                raise ValueError(f"Area '{area_code}': missing required block_name or district")

            # Extract population numbers
            total_pop_raw = pop_row.get("total_population") or props.get("total_population") or 0
            vuln_pop_raw = (
                pop_row.get("vulnerable_population_u5_o65")
                or pop_row.get("vulnerable_population")
                or props.get("vulnerable_population")
                or 0
            )

            total_population = int(total_pop_raw)
            vulnerable_population = int(vuln_pop_raw)
            validate_population(total_population, vulnerable_population, area_code)

            elevation_m = float(props.get("elevation_meters", 10.0))
            is_coastal = bool(props.get("is_coastal", False))
            flood_susceptibility = float(props.get("flood_susceptibility_index", 0.0))

            # Idempotent Upsert: Check if Area exists
            existing = session.query(Area).filter_by(area_code=area_code).first()
            if existing:
                existing.block_name = block_name
                existing.district = district
                existing.lgd_code = lgd_code
                existing.geom = WKTElement(wkt_geom, srid=4326)
                existing.total_population = total_population
                existing.vulnerable_population = vulnerable_population
                existing.elevation_m = elevation_m
                existing.is_coastal = is_coastal
                existing.flood_susceptibility = flood_susceptibility
                result.updated += 1
            else:
                new_area = Area(
                    area_code=area_code,
                    block_name=block_name,
                    district=district,
                    lgd_code=lgd_code,
                    geom=WKTElement(wkt_geom, srid=4326),
                    total_population=total_population,
                    vulnerable_population=vulnerable_population,
                    elevation_m=elevation_m,
                    is_coastal=is_coastal,
                    flood_susceptibility=flood_susceptibility,
                )
                session.add(new_area)
                result.loaded += 1

        except Exception as exc:
            result.errors.append(f"Area '{area_code}': {str(exc)}")
            result.skipped += 1

    if commit:
        session.commit()

    return result


def load_strategic_assets(
    session: Session,
    csv_path: Union[str, Path],
    commit: bool = True,
) -> SeedResult:
    """
    Load strategic civil & defense installations from CSV into `strategic_assets`.
    Idempotent: updates existing assets on match of natural primary key `id`.
    """
    result = SeedResult(table="strategic_assets")
    csv_path = Path(csv_path)

    if not csv_path.exists():
        result.errors.append(f"Strategic assets CSV not found: {csv_path}")
        return result

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            asset_id = (row.get("id") or "").strip()
            name = (row.get("name") or "").strip()
            asset_type = (row.get("type") or "").strip().lower()

            if not asset_id:
                result.errors.append(f"CSV line {row_idx}: missing asset id")
                result.skipped += 1
                continue
            if not name or not asset_type:
                result.errors.append(f"Asset '{asset_id}': missing name or type")
                result.skipped += 1
                continue

            try:
                lat = float(row.get("latitude") or 0.0)
                lon = float(row.get("longitude") or 0.0)
                validate_coordinates(lat, lon, asset_id)

                category = (row.get("category") or "CIVIL").strip()
                criticality = float(row.get("criticality") or 1.0)
                district = (row.get("district") or "").strip()
                if not district:
                    raise ValueError(f"Asset '{asset_id}': district is required")

                block_name = (row.get("block_name") or "").strip() or None
                capacity = (row.get("capacity") or "").strip() or None
                contact_channel = (row.get("contact_channel") or "").strip() or None
                readiness = float(row.get("readiness") or 1.0)
                provenance_tag = (row.get("provenance_tag") or "OBSERVED").strip()

                point_wkt = f"POINT({lon} {lat})"

                # Idempotent Upsert: Check if StrategicAsset exists
                existing = session.query(StrategicAsset).filter_by(id=asset_id).first()
                if existing:
                    existing.name = name
                    existing.asset_type = asset_type
                    existing.category = category
                    existing.criticality = criticality
                    existing.geom = WKTElement(point_wkt, srid=4326)
                    existing.latitude = lat
                    existing.longitude = lon
                    existing.district = district
                    existing.block_name = block_name
                    existing.capacity = capacity
                    existing.contact_channel = contact_channel
                    existing.readiness = readiness
                    existing.provenance_tag = provenance_tag
                    result.updated += 1
                else:
                    new_asset = StrategicAsset(
                        id=asset_id,
                        name=name,
                        asset_type=asset_type,
                        category=category,
                        criticality=criticality,
                        geom=WKTElement(point_wkt, srid=4326),
                        latitude=lat,
                        longitude=lon,
                        district=district,
                        block_name=block_name,
                        capacity=capacity,
                        contact_channel=contact_channel,
                        readiness=readiness,
                        provenance_tag=provenance_tag,
                    )
                    session.add(new_asset)
                    result.loaded += 1

            except Exception as exc:
                result.errors.append(f"Asset '{asset_id}': {str(exc)}")
                result.skipped += 1

    if commit:
        session.commit()

    return result


def seed_cyclone_all(
    session: Session,
    data_dir: Optional[Union[str, Path]] = None,
    commit: bool = True,
) -> Dict[str, SeedResult]:
    """Execute complete cyclone seed pipeline for both administrative blocks and strategic assets."""
    target_dir = resolve_default_data_dir(data_dir)
    geojson_path = target_dir / "odisha_blocks.geojson"
    block_csv_path = target_dir / "block_population.csv"
    asset_csv_path = target_dir / "strategic_assets.csv"

    # Fallback for strategic_assets if not in data/ subfolder
    if not asset_csv_path.exists() and (target_dir.parent / "strategic_assets.csv").exists():
        asset_csv_path = target_dir.parent / "strategic_assets.csv"

    blocks_res = load_blocks(session, geojson_path, block_csv_path, commit=commit)
    assets_res = load_strategic_assets(session, asset_csv_path, commit=commit)

    return {
        "areas": blocks_res,
        "strategic_assets": assets_res,
    }

