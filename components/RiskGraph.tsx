"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";

import { riskBarColor, riskLabel } from "@/lib/risk";
import { RiskGraph } from "@/lib/types";

type SimNode = d3.SimulationNodeDatum & RiskGraph["nodes"][number];
type SimLink = d3.SimulationLinkDatum<SimNode> & { weight: number; star: boolean };

const short = (s: string | null, n = 26) => {
  if (!s) return "";
  const t = s
    .replace(/ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ/gi, "ТОВ")
    .replace(/ПРИВАТНЕ ПІДПРИЄМСТВО/gi, "ПП")
    .replace(/ФІЗИЧНА ОСОБА[- ]ПІДПРИЄМЕЦЬ/gi, "ФОП")
    .replace(/ПРИВАТНЕ АКЦІОНЕРНЕ ТОВАРИСТВО/gi, "ПрАТ")
    .replace(/КОМУНАЛЬНЕ ПІДПРИЄМСТВО/gi, "КП")
    .replace(/"/g, "")
    .trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

/**
 * Ego network of a company: the company in the middle, its co-bidders around.
 * Circle size = how many tenders they shared with the centre; colour = risk;
 * dark-red ring = already in the AMCU register; line thickness = how often the
 * two met. Hover highlights a partner and shows a readable tooltip.
 */
export default function RiskGraphView({
  graph,
  height = 500,
  onSelect,
}: {
  graph: RiskGraph;
  height?: number;
  onSelect?: (edrpou: string) => void;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [limit, setLimit] = useState(20);
  const [allLabels, setAllLabels] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; node: SimNode } | null>(null);
  const [wrapWidth, setWrapWidth] = useState(600);

  const centreName = useMemo(() => graph.nodes.find((n) => n.center)?.name ?? null, [graph]);
  const totalPartners = graph.nodes.filter((n) => !n.center).length;

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select<SVGSVGElement, unknown>(ref.current);
    svg.selectAll("*").remove();
    const width = ref.current.clientWidth || 800;
    setWrapWidth(wrapRef.current?.clientWidth ?? width);

    const centre0 = graph.nodes.find((n) => n.center);
    const partners = graph.nodes.filter((n) => !n.center).sort((a, b) => b.nTenders - a.nTenders).slice(0, limit);
    const nodes: SimNode[] = [...(centre0 ? [{ ...centre0 }] : []), ...partners.map((n) => ({ ...n }))];
    const byId = new Map(nodes.map((n) => [n.edrpou, n]));
    const centre = nodes.find((n) => n.center);
    if (centre) {
      centre.fx = width / 2;
      centre.fy = height / 2;
    }
    const links: SimLink[] = [
      ...graph.edges
        .filter((e) => byId.has(e.source) && byId.has(e.target))
        .map((e) => ({ source: e.source, target: e.target, weight: e.weight, star: false })),
      ...(centre ? partners.map((n) => ({ source: centre.edrpou, target: n.edrpou, weight: n.nTenders, star: true })) : []),
    ];
    const maxW = d3.max(links, (l) => l.weight) ?? 1;
    const maxN = d3.max(partners, (n) => n.nTenders) ?? 1;
    const r = (n: SimNode) => (n.center ? 24 : 8 + 16 * Math.sqrt(n.nTenders / maxN));

    const g = svg.append("g");
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.4, 4]).on("zoom", (ev) => g.attr("transform", ev.transform)));

    const linkG = g.append("g");
    const link = linkG
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (l) => (l.star ? "#64748b" : "#cbd5e1"))
      .attr("stroke-opacity", (l) => (l.star ? 0.7 : 0.6))
      .attr("stroke-width", (l) => 1 + 6 * (l.weight / maxW));

    // numbers on the thickest star edges: how many tenders the two shared
    const edgeLabel = g
      .append("g")
      .selectAll("text")
      .data(links.filter((l) => l.star && l.weight >= Math.max(2, maxW * 0.25)))
      .join("text")
      .attr("font-size", 10)
      .attr("font-weight", 700)
      .attr("fill", "#334155")
      .attr("text-anchor", "middle")
      .attr("paint-order", "stroke")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .text((l) => l.weight);

    const node = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (_, d) => onSelect?.(d.edrpou))
      .on("mouseenter", (ev: MouseEvent, d) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        setTip({ x: ev.clientX - (rect?.left ?? 0), y: ev.clientY - (rect?.top ?? 0), node: d });
        link.attr("stroke-opacity", (l) => ((l.source as SimNode).edrpou === d.edrpou || (l.target as SimNode).edrpou === d.edrpou ? 0.95 : 0.12));
        node.attr("opacity", (o) => (o.edrpou === d.edrpou || o.center || links.some((l) => ((l.source as SimNode).edrpou === d.edrpou && (l.target as SimNode).edrpou === o.edrpou) || ((l.target as SimNode).edrpou === d.edrpou && (l.source as SimNode).edrpou === o.edrpou)) ? 1 : 0.25));
      })
      .on("mousemove", (ev: MouseEvent, d) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        setTip({ x: ev.clientX - (rect?.left ?? 0), y: ev.clientY - (rect?.top ?? 0), node: d });
      })
      .on("mouseleave", () => {
        setTip(null);
        link.attr("stroke-opacity", (l) => (l.star ? 0.7 : 0.6));
        node.attr("opacity", 1);
      });

    node
      .append("circle")
      .attr("r", (d) => r(d))
      .attr("fill", (d) => (d.center ? "#0f172a" : riskBarColor(d.score)))
      .attr("fill-opacity", 0.9)
      .attr("stroke", (d) => (d.label ? "#7f1d1d" : "#ffffff"))
      .attr("stroke-width", (d) => (d.label ? 4 : 1.5));

    // "!" badge on sanctioned partners
    node
      .filter((d) => !!d.label && !d.center)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", 12)
      .attr("font-weight", 800)
      .attr("fill", "#ffffff")
      .text("!");

    node
      .filter((d) => d.center || allLabels || d.nTenders >= maxN * 0.3 || !!d.label)
      .append("text")
      .attr("dy", (d) => r(d) + 13)
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => (d.center ? 12 : 10))
      .attr("font-weight", (d) => (d.center ? 800 : 500))
      .attr("fill", "#0f172a")
      .attr("paint-order", "stroke")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .text((d) => short(d.name) || d.edrpou);

    const sim = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.edrpou).distance((l) => (l.star ? 90 + 150 * (1 - l.weight / maxW) : 70)))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<SimNode>().radius((d) => r(d) + 16))
      .on("tick", () => {
        link
          .attr("x1", (l) => (l.source as SimNode).x ?? 0)
          .attr("y1", (l) => (l.source as SimNode).y ?? 0)
          .attr("x2", (l) => (l.target as SimNode).x ?? 0)
          .attr("y2", (l) => (l.target as SimNode).y ?? 0);
        edgeLabel
          .attr("x", (l) => (((l.source as SimNode).x ?? 0) + ((l.target as SimNode).x ?? 0)) / 2)
          .attr("y", (l) => (((l.source as SimNode).y ?? 0) + ((l.target as SimNode).y ?? 0)) / 2 + 4);
        node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    node.call(
      d3
        .drag<SVGGElement, SimNode>()
        .on("start", (ev, d) => {
          sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (ev, d) => {
          d.fx = ev.x;
          d.fy = ev.y;
        })
        .on("end", (ev, d) => {
          sim.alphaTarget(0);
          if (!d.center) {
            d.fx = null;
            d.fy = null;
          }
        }),
    );

    return () => {
      sim.stop();
    };
  }, [graph, height, onSelect, limit, allLabels]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted">
        <label className="flex items-center gap-2">
          показати партнерів
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded border border-line bg-white px-2 py-0.5">
            {[10, 20, 40].filter((v) => v <= Math.max(10, totalPartners)).map((v) => <option key={v} value={v}>{v}</option>)}
            {totalPartners > 40 && <option value={totalPartners}>усіх ({totalPartners})</option>}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allLabels} onChange={(e) => setAllLabels(e.target.checked)} />
          підписати всі
        </label>
        <span>перетягуйте кола, крутіть колесо миші для масштабу, клік відкриває картку партнера</span>
      </div>

      <svg ref={ref} className="w-full rounded-2xl border border-line bg-white" style={{ height }} role="img" aria-label={`Мапа партнерів компанії ${centreName ?? ""} по торгах`} />

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-line bg-white/95 p-3 text-xs text-ink shadow-sm">
        <p className="mb-1 font-bold">Як читати</p>
        <div className="flex items-center gap-2"><span className="inline-block h-4 w-4 rounded-full bg-[#0f172a]" /> ця компанія</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: riskBarColor(0.2) }} />
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: riskBarColor(0.55) }} />
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: riskBarColor(0.8) }} />
          партнер: низький · підвищений · високий ризик
        </div>
        <div className="mt-1 flex items-center gap-2"><span className="inline-block h-4 w-4 rounded-full border-[3px] border-[#7f1d1d] bg-white text-center text-[9px] font-black leading-[10px] text-[#7f1d1d]">!</span> уже покарана АМКУ</div>
        <div className="mt-1 flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-slate-400" /><span className="inline-block h-4 w-4 rounded-full bg-slate-400" /> більше коло = більше спільних тендерів</div>
        <div className="mt-1 flex items-center gap-2"><span className="inline-block h-[5px] w-6 rounded bg-slate-500" /> товща лінія і число = частіше зустрічались</div>
      </div>

      {tip && (
        <div className="pointer-events-none absolute z-10 max-w-xs rounded-xl border border-line bg-white p-3 text-xs shadow-lg" style={{ left: Math.min(tip.x + 14, wrapWidth - 260), top: tip.y + 14 }}>
          <p className="font-bold text-ink">{tip.node.name ?? tip.node.edrpou}</p>
          <p className="font-mono text-muted">{tip.node.edrpou}</p>
          {tip.node.center ? (
            <p className="mt-1 text-muted">компанія, картку якої ви дивитесь</p>
          ) : (
            <>
              <p className="mt-1">зустрічались у <b>{tip.node.nTenders}</b> тендерах</p>
              <p>схожість з покараними: <b style={{ color: riskBarColor(tip.node.score) }}>{tip.node.score === null ? "—" : `${Math.round(tip.node.score * 100)} % · ${riskLabel(tip.node.score)}`}</b></p>
              {tip.node.label && <p className="font-semibold text-red-800">уже в реєстрі АМКУ</p>}
              <p className="mt-1 text-muted">клік — відкрити картку</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
