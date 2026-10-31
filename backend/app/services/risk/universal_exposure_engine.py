"""
SURAKSHA — Universal Spatial Intersection & Exposure Engine
Accepts any canonical HazardFootprintEvent (Cyclone, Wildfire, Flood, Earthquake)
and computes deterministic block prioritisation, infrastructure exposure,
route severance, and safe staging recommendations.
Works 100% offline with zero external C-dependencies.
"""
import csv
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.app.schemas.hazard_footprint import (
    HazardFootprintEvent,
    HazardType,
    SeverityLevel,
    ProvenanceTag,
    BlockExposureResult,
    AssetExposureResult,
    RouteExposureResult,
    HazardExposureReport,
)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in km between two WGS-84 coordinates."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(R * c, 2)


def point_in_polygon(lon: float, lat: float, polygon_coords: List[List[float]]) -> bool:
    """Deterministic Ray-Casting algorithm for Point-in-Polygon intersection."""
    inside = False
    n = len(polygon_coords)
    if n < 3:
        return False
    p1x, p1y = polygon_coords[0][0], polygon_coords[0][1]
    for i in range(1, n + 1):
        p2x, p2y = polygon_coords[i % n][0], polygon_coords[i % n][1]
        if min(p1y, p2y) < lat <= max(p1y, p2y):
            if lon <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or lon <= xinters:
                    inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def get_polygon_rings(geometry: Dict[str, Any]) -> List[List[List[float]]]:
    """Extract coordinate rings from GeoJSON Polygon or MultiPolygon."""
    g_type = geometry.get("type", "")
    coords = geometry.get("coordinates", [])
    if g_type == "Polygon":
        return coords
    elif g_type == "MultiPolygon":
        rings = []
        for poly in coords:
            rings.extend(poly)
        return rings
    return []


def get_geometry_centroid(geometry: Dict[str, Any]) -> Tuple[float, float]:
    """Compute approximate centroid (lat, lon) for a geometry."""
    rings = get_polygon_rings(geometry)
    if not rings or not rings[0]:
        return (20.0, 85.8)
    lons = [p[0] for p in rings[0]]
    lats = [p[1] for p in rings[0]]
    return (sum(lats) / len(lats), sum(lons) / len(lons))


class UniversalExposureEngine:
    """
    Deterministic spatial exposure engine computing block prioritization,
    asset impact, and route cutoffs for any HazardFootprintEvent.
    """

    @classmethod
    def evaluate(
        cls,
        event: HazardFootprintEvent,
        data_dir: Optional[Path] = None,
    ) -> HazardExposureReport:
        if data_dir is None:
            data_dir = Path(__file__).resolve().parents[4] / "db" / "seed" / "data"

        rings = get_polygon_rings(event.geometry)
        outer_ring = rings[0] if rings else []
        cent_lat, cent_lon = get_geometry_centroid(event.geometry)

        # 1. Evaluate 39 Administrative Blocks
        blocks_result = cls._evaluate_blocks(event, outer_ring, cent_lat, cent_lon, data_dir)

        # 2. Evaluate 42 Strategic Assets
        assets_result = cls._evaluate_assets(event, outer_ring, cent_lat, cent_lon, data_dir)

        # 3. Evaluate Supply Corridors
        routes_result = cls._evaluate_routes(event, outer_ring, data_dir)

        # 4. Safe Staging Hubs (depots outside footprint with high readiness)
        safe_hubs = [
            a.name for a in assets_result
            if a.exposure_level == "SECURE" and any(k in a.asset_type.lower() for k in ["depot", "staging", "warehouse", "base"])
        ]
        if not safe_hubs:
            safe_hubs = ["Cuttack Central Relief Depot", "Sambalpur Forward Logistics Hub", "Bhubaneswar Strategic Reserve"]

        return HazardExposureReport(
            event_id=event.event_id,
            hazard_type=event.hazard_type,
            name=event.name,
            severity=event.severity,
            provenance=event.provenance,
            ranked_blocks=blocks_result,
            exposed_assets=assets_result,
            evaluated_routes=routes_result,
            safe_staging_hubs=safe_hubs[:3],
            generated_at=datetime.now(timezone.utc),
        )

    @classmethod
    def _evaluate_blocks(
        cls,
        event: HazardFootprintEvent,
        outer_ring: List[List[float]],
        cent_lat: float,
        cent_lon: float,
        data_dir: Path,
    ) -> List[BlockExposureResult]:
        blocks_geojson = data_dir / "odisha_blocks.geojson"
        pop_csv = data_dir / "block_population.csv"

        populations: Dict[str, Dict[str, int]] = {}
        if pop_csv.exists():
            try:
                with open(pop_csv, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        code = row.get("area_code", "")
                        populations[code] = {
                            "total": int(row.get("total_population", 100000)),
                            "vulnerable": int(row.get("vulnerable_population", 20000)),
                        }
            except Exception:
                pass

        results: List[BlockExposureResult] = []

        if blocks_geojson.exists():
            try:
                with open(blocks_geojson, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    features = data.get("features", [])

                    for feat in features:
                        props = feat.get("properties", {})
                        code = props.get("area_code", "")
                        name = props.get("block_name", code)
                        district = props.get("district", "Odisha")

                        # Centroid of block
                        geom = feat.get("geometry", {})
                        b_lat, b_lon = get_geometry_centroid(geom)

                        # Check intersection
                        is_intersecting = False
                        if outer_ring:
                            is_intersecting = point_in_polygon(b_lon, b_lat, outer_ring)

                        dist = haversine_km(cent_lat, cent_lon, b_lat, b_lon)
                        pop_info = populations.get(code, {"total": 85000, "vulnerable": 18000})

                        # Deterministic Multi-Hazard Score Calculation (0 - 100)
                        score, reasons = cls._score_block(event, is_intersecting, dist, pop_info, district, name)

                        tier = "CRITICAL" if score >= 80 else ("HIGH" if score >= 60 else ("MODERATE" if score >= 40 else "LOW"))

                        results.append(
                            BlockExposureResult(
                                area_code=code,
                                block_name=name,
                                district=district,
                                priority_score=round(score, 1),
                                risk_tier=tier,
                                reasons=reasons,
                                population_exposed=pop_info["total"] if is_intersecting else int(pop_info["total"] * max(0.1, (1.0 - dist / 100.0))),
                                is_intersecting=is_intersecting,
                                distance_km=dist,
                            )
                        )
            except Exception:
                pass

        # Sort descending by priority score
        results.sort(key=lambda b: b.priority_score, reverse=True)
        return results

    @classmethod
    def _score_block(
        cls,
        event: HazardFootprintEvent,
        is_intersecting: bool,
        dist: float,
        pop_info: Dict[str, int],
        district: str,
        block_name: str,
    ) -> Tuple[float, List[str]]:
        reasons: List[str] = []
        base_score = 0.0

        sev_map = {
            SeverityLevel.CRITICAL: 45.0,
            SeverityLevel.HIGH: 35.0,
            SeverityLevel.MODERATE: 25.0,
            SeverityLevel.LOW: 15.0,
        }
        hazard_weight = sev_map.get(event.severity, 30.0)

        if is_intersecting:
            base_score += 50.0 + hazard_weight * 0.5
            reasons.append(f"Direct spatial overlap with active {event.hazard_type.value} footprint")
        else:
            decay = max(0.0, 50.0 - dist * 0.45)
            base_score += decay
            if dist <= 30.0:
                reasons.append(f"Within primary peripheral exposure buffer ({dist:.1f} km from impact center)")
            else:
                reasons.append(f"Peripheral distance decay applied ({dist:.1f} km from center)")

        # Population density contribution
        vuln = pop_info.get("vulnerable", 15000)
        pop_factor = min(20.0, (vuln / 30000.0) * 20.0)
        base_score += pop_factor
        if vuln > 20000:
            reasons.append(f"High vulnerable demographic density: {vuln:,} children and elderly residents")
        else:
            reasons.append(f"Demographic baseline: {pop_info.get('total', 75000):,} residents ({vuln:,} vulnerable)")

        # Hazard-Specific Deterministic Adders
        if event.hazard_type == HazardType.CYCLONE:
            wind = event.attributes.get("max_wind_kmh", 215.0)
            if is_intersecting:
                base_score += 15.0
                reasons.append(f"Sustained wind velocity of {wind} km/h exceeding structural safety threshold")
            if "puri" in district.lower() or "jagatsinghpur" in district.lower():
                base_score += 10.0
                reasons.append("Coastal oceanic storm surge inundation corridor")

        elif event.hazard_type == HazardType.WILDFIRE:
            frp = event.attributes.get("total_frp_mw", 140.0)
            if is_intersecting:
                base_score += 15.0
                reasons.append(f"Active thermal radiative intensity: {frp} MW across forest canopy")

        elif event.hazard_type == HazardType.FLOOD:
            depth = event.attributes.get("inundation_water_depth_m", 2.0)
            if is_intersecting:
                base_score += 15.0
                reasons.append(f"Estimated inundation water depth: {depth} m overlapping transport culverts")

        elif event.hazard_type == HazardType.EARTHQUAKE:
            pga = event.attributes.get("peak_ground_acceleration_g", 0.4)
            if is_intersecting:
                base_score += 15.0
                reasons.append(f"Peak ground acceleration {pga}g exceeds standard masonry tolerance")

        final_score = min(100.0, max(5.0, base_score))
        return final_score, reasons

    @classmethod
    def _evaluate_assets(
        cls,
        event: HazardFootprintEvent,
        outer_ring: List[List[float]],
        cent_lat: float,
        cent_lon: float,
        data_dir: Path,
    ) -> List[AssetExposureResult]:
        assets_csv = data_dir / "strategic_assets.csv"
        results: List[AssetExposureResult] = []

        if assets_csv.exists():
            try:
                with open(assets_csv, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        aid = row.get("id", "")
                        name = row.get("name", aid)
                        atype = row.get("asset_type", "hospital")
                        district = row.get("district", "Odisha")
                        crit = row.get("criticality", "HIGH")
                        lat = float(row.get("latitude", 20.0))
                        lon = float(row.get("longitude", 85.8))

                        is_inside = False
                        if outer_ring:
                            is_inside = point_in_polygon(lon, lat, outer_ring)

                        dist = haversine_km(cent_lat, cent_lon, lat, lon)

                        if is_inside:
                            level = "DIRECT_IMPACT"
                            status = "CRITICAL_THREAT"
                        elif dist <= 12.0:
                            level = "PERIPHERAL"
                            status = "MONITORING"
                        else:
                            level = "SECURE"
                            status = "OPERATIONAL"

                        results.append(
                            AssetExposureResult(
                                asset_id=aid,
                                name=name,
                                asset_type=atype,
                                district=district,
                                criticality=crit,
                                status=status,
                                exposure_level=level,
                                distance_km=dist,
                            )
                        )
            except Exception:
                pass

        results.sort(key=lambda a: (0 if a.exposure_level == "DIRECT_IMPACT" else (1 if a.exposure_level == "PERIPHERAL" else 2), a.distance_km))
        return results

    @classmethod
    def _evaluate_routes(
        cls,
        event: HazardFootprintEvent,
        outer_ring: List[List[float]],
        data_dir: Path,
    ) -> List[RouteExposureResult]:
        roads_file = data_dir / "osm_roads_coastal_odisha.geojson"
        results: List[RouteExposureResult] = []

        if roads_file.exists():
            try:
                with open(roads_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    features = data.get("features", [])

                    for feat in features:
                        props = feat.get("properties", {})
                        rid = props.get("id", feat.get("id", f"R-{len(results)+1}"))
                        name = props.get("name", "Arterial Highway Corridor")
                        rtype = props.get("route_type", "PRIMARY_HIGHWAY")

                        geom = feat.get("geometry", {})
                        g_type = geom.get("type", "")
                        coords = geom.get("coordinates", [])

                        points_to_check: List[List[float]] = []
                        if g_type == "LineString":
                            points_to_check = coords
                        elif g_type == "MultiLineString":
                            for line in coords:
                                points_to_check.extend(line)

                        if not points_to_check or not outer_ring:
                            results.append(RouteExposureResult(route_id=str(rid), name=name, route_type=rtype, status="PASSABLE", cutoff_percentage=0.0))
                            continue

                        cut_points = sum(1 for p in points_to_check if point_in_polygon(p[0], p[1], outer_ring))
                        ratio = cut_points / len(points_to_check)

                        if ratio >= 0.50:
                            status = "CUT"
                        elif ratio >= 0.10:
                            status = "AT_RISK"
                        else:
                            status = "PASSABLE"

                        results.append(
                            RouteExposureResult(
                                route_id=str(rid),
                                name=name,
                                route_type=rtype,
                                status=status,
                                cutoff_percentage=round(ratio * 100.0, 1),
                            )
                        )
            except Exception:
                pass

        results.sort(key=lambda r: (0 if r.status == "CUT" else (1 if r.status == "AT_RISK" else 2)))
        return results
