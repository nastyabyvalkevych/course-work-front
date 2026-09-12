"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

import { RiskRegion } from "@/lib/types";

/** geoBoundaries ADM1 English names -> Prozorro region strings. */
export const REGION_NAMES: Record<string, string> = {
  "Autonomous Republic of Crimea": "Автономна Республіка Крим",
  "Cherkasy Oblast": "Черкаська область",
  "Chernihiv Oblast": "Чернігівська область",
  "Chernivtsi Oblast": "Чернівецька область",
  "Dnipropetrovsk Oblast": "Дніпропетровська область",
  "Donetsk Oblast": "Донецька область",
  "Ivano-Frankivsk Oblast": "Івано-Франківська область",
  "Kharkiv Oblast": "Харківська область",
  "Kherson Oblast": "Херсонська область",
  "Khmelnytskyi Oblast": "Хмельницька область",
  "Kirovohrad Oblast": "Кіровоградська область",
  Kyiv: "м. Київ",
  "Kyiv Oblast": "Київська область",
  "Luhansk Oblast": "Луганська область",
  "Lviv Oblast": "Львівська область",
  "Mykolaiv Oblast": "Миколаївська область",
  "Odessa Oblast": "Одеська область",
  "Poltava Oblast": "Полтавська область",
  "Rivne Oblast": "Рівненська область",
  Sevastopol: "м. Севастополь",
  "Sumy Oblast": "Сумська область",
  "Ternopil Oblast": "Тернопільська область",
  "Vinnytsia Oblast": "Вінницька область",
  "Volyn Oblast": "Волинська область",
  "Zakarpattia Oblast": "Закарпатська область",
  "Zaporizhia Oblast": "Запорізька область",
  "Zhytomyr Oblast": "Житомирська область",
};

export type MapMetric = "highRiskShare" | "meanScore" | "sanctionedShare" | "sanctioned" | "companies";

export const METRICS: Record<MapMetric, { label: string; format: (v: number) => string; hint: string }> = {
  highRiskShare: { label: "Частка компаній з високим ризиком", format: (v) => `${(v * 100).toFixed(1)} %`, hint: "компанії, чия історія дуже схожа на покараних (оцінка від 70 %)" },
  meanScore: { label: "Середня схожість з покараними", format: (v) => `${(v * 100).toFixed(1)} %`, hint: "середня оцінка по компаніях області" },
  sanctionedShare: { label: "Частка компаній у реєстрі АМКУ", format: (v) => `${(v * 100).toFixed(1)} %`, hint: "вже покарані за змову" },
  sanctioned: { label: "Компаній у реєстрі АМКУ", format: (v) => String(v), hint: "абсолютна кількість" },
  companies: { label: "Компаній-учасників", format: (v) => String(v), hint: "з мінімальною кількістю тендерів" },
};

type Feature = GeoJSON.Feature<GeoJSON.Geometry, { shapeName: string }>;

export default function RiskMap({
  regions,
  metric,
  onSelect,
  selected,
  height = 520,
}: {
  regions: RiskRegion[];
  metric: MapMetric;
  onSelect?: (region: string | null) => void;
  selected?: string | null;
  height?: number;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; region: string; row?: RiskRegion } | null>(null);

  useEffect(() => {
    fetch("/ukraine-oblasts.geojson").then((r) => r.json()).then(setGeo).catch(() => setGeo(null));
  }, []);

  useEffect(() => {
    if (!ref.current || !geo) return;
    const svg = d3.select<SVGSVGElement, unknown>(ref.current);
    svg.selectAll("*").remove();
    const width = ref.current.clientWidth || 900;
    const byRegion = new Map(regions.map((r) => [r.region, r]));
    const values = regions.map((r) => r[metric] as number).filter((v) => Number.isFinite(v));
    const scale = d3
      .scaleSequential(d3.interpolateReds)
      .domain([d3.min(values) ?? 0, d3.max(values) ?? 1]);

    const projection = d3.geoMercator().fitSize([width, height], geo as GeoJSON.FeatureCollection);
    const path = d3.geoPath(projection);

    svg
      .append("g")
      .selectAll<SVGPathElement, Feature>("path")
      .data(geo.features as Feature[])
      .join("path")
      .attr("d", (f) => path(f) ?? "")
      .attr("fill", (f) => {
        const row = byRegion.get(REGION_NAMES[f.properties.shapeName] ?? "");
        return row ? scale(row[metric] as number) : "#e5e7eb";
      })
      .attr("stroke", (f) => (REGION_NAMES[f.properties.shapeName] === selected ? "#0f172a" : "#ffffff"))
      .attr("stroke-width", (f) => (REGION_NAMES[f.properties.shapeName] === selected ? 2.5 : 0.8))
      .style("cursor", "pointer")
      .on("mousemove", (ev, f) => {
        const region = REGION_NAMES[f.properties.shapeName] ?? f.properties.shapeName;
        const [x, y] = d3.pointer(ev, ref.current);
        setHover({ x, y, region, row: byRegion.get(region) });
      })
      .on("mouseleave", () => setHover(null))
      .on("click", (_, f) => {
        const region = REGION_NAMES[f.properties.shapeName] ?? null;
        onSelect?.(region === selected ? null : region);
      });

    // legend
    const lg = svg.append("g").attr("transform", `translate(16, ${height - 36})`);
    const w = 180;
    const grad = svg.append("defs").append("linearGradient").attr("id", "risk-legend");
    for (let i = 0; i <= 10; i += 1) {
      grad.append("stop").attr("offset", `${i * 10}%`).attr("stop-color", d3.interpolateReds(i / 10));
    }
    lg.append("rect").attr("width", w).attr("height", 10).attr("fill", "url(#risk-legend)");
    lg.append("text").attr("y", 24).attr("font-size", 10).attr("fill", "#475569").text(METRICS[metric].format(scale.domain()[0]));
    lg.append("text").attr("x", w).attr("y", 24).attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#475569").text(METRICS[metric].format(scale.domain()[1]));
  }, [geo, regions, metric, selected, height, onSelect]);

  return (
    <div className="relative">
      <svg ref={ref} className="w-full rounded-2xl border border-line bg-white" style={{ height }} role="img" aria-label="Мапа ризику змови за областями" />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow"
          style={{ left: Math.min(hover.x + 12, 700), top: hover.y + 12 }}
        >
          <div className="font-semibold text-ink">{hover.region}</div>
          {hover.row ? (
            <>
              <div>{METRICS[metric].label}: <b>{METRICS[metric].format(hover.row[metric] as number)}</b></div>
              <div className="text-muted">компаній {hover.row.companies} · у реєстрі АМКУ {hover.row.sanctioned} · високий ризик {hover.row.highRisk}</div>
            </>
          ) : (
            <div className="text-muted">немає даних</div>
          )}
        </div>
      )}
    </div>
  );
}
