/// <reference types="vite/client" />

// GeoJSON types (provided by maplibre-gl's bundled @types/geojson)
declare namespace GeoJSON {
  interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }
  interface Feature<G = Geometry, P = Record<string, unknown>> {
    type: 'Feature';
    geometry: G;
    properties: P;
  }
  interface LineString {
    type: 'LineString';
    coordinates: [number, number][];
  }
  interface Point {
    type: 'Point';
    coordinates: [number, number];
  }
  interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][];
  }
  type Geometry = LineString | Point | Polygon;
}
