const nodes = Array.from({ length: 1000 }, (_, i) => ({ id: `node-${i}` }));
const start = performance.now();
for (let i = 0; i < 10000; i++) {
  nodes.find(n => n.id === "node-999");
}
console.log("find", performance.now() - start);

const map = new Map(nodes.map(n => [n.id, n]));
const start2 = performance.now();
for (let i = 0; i < 10000; i++) {
  map.get("node-999");
}
console.log("map get", performance.now() - start2);
