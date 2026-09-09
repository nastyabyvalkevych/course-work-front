"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

import { riskBarColor } from "@/lib/risk";
import { RiskGraph } from "@/lib/types";

type SimNode = d3.SimulationNodeDatum & RiskGraph["nodes"][number];
type SimLink = d3.SimulationLinkDatum<SimNode> & { weight: number };

/**
 * Ego network of a company: centre node + its co-bidders, edges = shared tenders.
 * Colour = risk score, red ring = company is in the AMCU register.
 */
export default function RiskGraphView({
  graph,
  height = 460,
  onSelect,
}: {
  graph: RiskGraph;
  height?: number;
  onSelect?: (edrpou: string) => void;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select<SVGSVGElement, unknown>(ref.current);
    svg.selectAll("*").remove();
    const width = ref.current.clientWidth || 800;

    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
    const byId = new Map(nodes.map((n) => [n.edrpou, n]));
    const centre = nodes.find((n) => n.center);
    const links: SimLink[] = [
      ...graph.edges
        .filter((e) => byId.has(e.source) && byId.has(e.target))
        .map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
      // star edges from the centre (co-bidding count stored on nTenders of neighbours)
      ...(centre
        ? nodes
            .filter((n) => !n.center)
            .map((n) => ({ source: centre.edrpou, target: n.edrpou, weight: n.nTenders }))
        : []),
    ];
    const maxW = d3.max(links, (l) => l.weight) ?? 1;
    const maxN = d3.max(nodes, (n) => n.nTenders) ?? 1;
    const r = (n: SimNode) => (n.center ? 22 : 6 + 14 * Math.sqrt(n.nTenders / maxN));

    const g = svg.append("g");
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.4, 4])
        .on("zoom", (ev) => g.attr("transform", ev.transform)),
    );

    const link = g
      .append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.5)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (l) => 0.6 + 4 * (l.weight / maxW));

    const node = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (_, d) => onSelect?.(d.edrpou));

    node
      .append("circle")
      .attr("r", (d) => r(d))
      .attr("fill", (d) => riskBarColor(d.score))
      .attr("fill-opacity", 0.85)
      .attr("stroke", (d) => (d.label ? "#7f1d1d" : d.center ? "#0f172a" : "#ffffff"))
      .attr("stroke-width", (d) => (d.label ? 3 : 1.5));

    node
      .append("title")
      .text(
        (d) =>
          `${d.name ?? d.edrpou}\nЄДРПОУ ${d.edrpou}\nризик ${
            d.score === null ? "—" : (d.score * 100).toFixed(0) + " %"
          }${d.label ? "\nу реєстрі АМКУ" : ""}${d.center ? "" : `\nспільних тендерів: ${d.nTenders}`}`,
      );

    node
      .filter((d) => d.center || d.nTenders >= maxN * 0.35 || !!d.label)
      .append("text")
      .attr("dy", (d) => r(d) + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "#334155")
      .text((d) => (d.name ? d.name.slice(0, 28) : d.edrpou));

    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.edrpou)
          .distance((l) => 60 + 120 * (1 - l.weight / maxW)),
      )
      .force("charge", d3.forceManyBody().strength(-160))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<SimNode>().radius((d) => r(d) + 4))
      .on("tick", () => {
        link
          .attr("x1", (l) => (l.source as SimNode).x ?? 0)
          .attr("y1", (l) => (l.source as SimNode).y ?? 0)
          .attr("x2", (l) => (l.target as SimNode).x ?? 0)
          .attr("y2", (l) => (l.target as SimNode).y ?? 0);
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
          d.fx = null;
          d.fy = null;
        }),
    );

    return () => {
      sim.stop();
    };
  }, [graph, height, onSelect]);

  return (
    <svg
      ref={ref}
      className="w-full rounded-2xl border border-line bg-white"
      style={{ height }}
      role="img"
      aria-label="Граф співучасті компанії"
    />
  );
}
