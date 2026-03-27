import type { WorkspaceRoadmap } from "@psyos/contracts";

type RoadmapDagProps = {
  roadmap: WorkspaceRoadmap;
};

type RoadmapNode = WorkspaceRoadmap["items"][number] & {
  x: number;
  y: number;
  layer: number;
};

const NODE_WIDTH = 244;
const NODE_HEIGHT = 118;
const COLUMN_GAP = 42;
const LAYER_GAP = 74;
const PADDING_X = 32;
const PADDING_Y = 48;

function buildDagLayout(roadmap: WorkspaceRoadmap) {
  const itemMap = new Map(roadmap.items.map((item) => [item.id, item]));
  const incoming = new Map(roadmap.items.map((item) => [item.id, 0]));
  const outgoing = new Map<string, string[]>();

  for (const dependency of roadmap.dependencies) {
    if (
      !itemMap.has(dependency.fromItemId) ||
      !itemMap.has(dependency.toItemId)
    ) {
      continue;
    }

    incoming.set(
      dependency.toItemId,
      (incoming.get(dependency.toItemId) ?? 0) + 1,
    );
    const targets = outgoing.get(dependency.fromItemId) ?? [];
    targets.push(dependency.toItemId);
    outgoing.set(dependency.fromItemId, targets);
  }

  const columnOrder = new Map(
    roadmap.columns.map((column, index) => [column.id, index]),
  );
  const queue = roadmap.items
    .filter((item) => (incoming.get(item.id) ?? 0) === 0)
    .sort((left, right) => {
      const leftColumn = columnOrder.get(left.columnId) ?? 0;
      const rightColumn = columnOrder.get(right.columnId) ?? 0;

      if (leftColumn !== rightColumn) {
        return leftColumn - rightColumn;
      }

      return left.title.localeCompare(right.title);
    })
    .map((item) => item.id);
  const layerMap = new Map<string, number>();
  const unresolved = new Map(incoming);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      break;
    }

    const currentLayer = layerMap.get(currentId) ?? 0;
    for (const nextId of outgoing.get(currentId) ?? []) {
      layerMap.set(
        nextId,
        Math.max(layerMap.get(nextId) ?? 0, currentLayer + 1),
      );
      const remaining = (unresolved.get(nextId) ?? 0) - 1;
      unresolved.set(nextId, remaining);
      if (remaining === 0) {
        queue.push(nextId);
      }
    }
  }

  const fallbackLayer =
    roadmap.items.length === 0
      ? 0
      : Math.max(0, ...Array.from(layerMap.values(), (value) => value)) + 1;

  for (const item of roadmap.items) {
    if (!layerMap.has(item.id)) {
      layerMap.set(item.id, fallbackLayer);
    }
  }

  const groups = new Map<number, WorkspaceRoadmap["items"]>();
  for (const item of roadmap.items) {
    const layer = layerMap.get(item.id) ?? 0;
    const group = groups.get(layer) ?? [];
    group.push(item);
    groups.set(layer, group);
  }

  const nodes: RoadmapNode[] = [];
  const layerKeys = Array.from(groups.keys()).sort(
    (left, right) => left - right,
  );
  let width = NODE_WIDTH + PADDING_X * 2;

  for (const layer of layerKeys) {
    const group = (groups.get(layer) ?? []).sort((left, right) => {
      const leftColumn = columnOrder.get(left.columnId) ?? 0;
      const rightColumn = columnOrder.get(right.columnId) ?? 0;

      if (leftColumn !== rightColumn) {
        return leftColumn - rightColumn;
      }

      return left.title.localeCompare(right.title);
    });

    const rowWidth =
      group.length * NODE_WIDTH + Math.max(0, group.length - 1) * COLUMN_GAP;
    width = Math.max(width, rowWidth + PADDING_X * 2);
    const startX = PADDING_X + (width - PADDING_X * 2 - rowWidth) / 2;
    const y = PADDING_Y + layer * (NODE_HEIGHT + LAYER_GAP);

    group.forEach((item, index) => {
      nodes.push({
        ...item,
        x: startX + index * (NODE_WIDTH + COLUMN_GAP),
        y,
        layer,
      });
    });
  }

  const height =
    PADDING_Y * 2 +
    Math.max(1, layerKeys.length) * NODE_HEIGHT +
    Math.max(0, layerKeys.length - 1) * LAYER_GAP;

  return {
    nodes,
    width,
    height,
  };
}

function edgePath(fromNode: RoadmapNode, toNode: RoadmapNode) {
  const startX = fromNode.x + NODE_WIDTH / 2;
  const startY = fromNode.y + NODE_HEIGHT;
  const endX = toNode.x + NODE_WIDTH / 2;
  const endY = toNode.y;
  const controlY = startY + (endY - startY) / 2;

  return `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`;
}

function statusClass(status: string) {
  if (status === "done") return "done";
  if (status === "in_progress") return "in-progress";
  if (status === "blocked") return "blocked";
  if (status === "ready") return "ready";
  return "backlog";
}

export function RoadmapDag({ roadmap }: RoadmapDagProps) {
  const layout = buildDagLayout(roadmap);
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));

  return (
    <div className="dag-shell">
      <div className="dag-meta">
        <span>{layout.nodes.length} nodes</span>
        <span>{roadmap.dependencies.length} edges</span>
        <span>{roadmap.summary.ready} ready</span>
        <span>{roadmap.summary.inProgress} in progress</span>
      </div>
      <div className="dag-canvas">
        <svg
          aria-label="Workspace roadmap dependency graph"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
        >
          <defs>
            <marker
              id="psyos-dag-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto-start-reverse"
              refX="5"
              refY="4"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
            </marker>
          </defs>

          {roadmap.dependencies.map((dependency) => {
            const fromNode = nodeMap.get(dependency.fromItemId);
            const toNode = nodeMap.get(dependency.toItemId);

            if (!fromNode || !toNode) {
              return null;
            }

            return (
              <path
                className="dag-edge"
                d={edgePath(fromNode, toNode)}
                key={dependency.id}
                markerEnd="url(#psyos-dag-arrow)"
              />
            );
          })}

          {layout.nodes.map((node) => (
            <g
              className={`dag-node dag-node-${statusClass(node.status)}`}
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
            >
              <rect height={NODE_HEIGHT} rx="22" width={NODE_WIDTH} />
              <text className="dag-node-column" x="18" y="26">
                {node.columnTitle}
              </text>
              <text className="dag-node-title" x="18" y="50">
                {node.title}
              </text>
              <text className="dag-node-kind" x="18" y="74">
                {node.kind}
              </text>
              <text className="dag-node-meta" x="18" y="98">
                {node.projectSlug ?? "workspace"} /{" "}
                {node.studySlug ?? "general"}
              </text>
              {node.assigneeHandle ? (
                <text className="dag-node-assignee" x={NODE_WIDTH - 18} y="26">
                  {node.assigneeHandle}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
