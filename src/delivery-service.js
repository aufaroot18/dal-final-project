/**
 * ICPC 2025 World Finals - Problem E: Delivery Service
 * Node.js Solution
 * * Algorithm: DSU (Disjoint Set Union) + Small-to-Large Merging
 * Time Complexity: O(M * log(N)^2) typically, or O(M alpha(N) log N)
 */

const fs = require("fs");

// --- Input Handling Helper (Fast I/O) ---
function readInput() {
  try {
    const buffer = fs.readFileSync(0, "utf-8");
    const tokens = buffer.trim().split(/\s+/);
    let ptr = 0;
    return () => (ptr < tokens.length ? tokens[ptr++] : null);
  } catch (e) {
    return () => null;
  }
}

const next = readInput();

// --- Mathematical Helper ---
// Calculate nC2: n * (n - 1) / 2
function nC2(n) {
  if (n < 2) return 0;
  // Using BigInt for safety if N is extremely large, though Number is usually fine for N=200k
  // Here we use Number for performance as max result ~2e10 fits in safe integer.
  return (n * (n - 1)) / 2;
}

// --- Main Logic ---
function solve() {
  const N_str = next();
  const M_str = next();

  if (!N_str || !M_str) return;

  const N = parseInt(N_str, 10);
  const M = parseInt(M_str, 10);

  // DSU State
  // Nodes: 1..N (In/Morning), N+1..2N (Out/Noon)
  // We use 1-based indexing for convenience to match logic, array size 2*N + 2
  const parent = new Int32Array(2 * N + 2);
  const citiesInCC = new Int32Array(2 * N + 2);

  // Using JS Map for sparse storage of intersection counts
  // partners[root] = Map<other_root, count_of_intersections>
  const partners = new Array(2 * N + 2);

  let currentAns = 0;

  // Initialization
  for (let i = 1; i <= 2 * N; i++) {
    parent[i] = i;
    partners[i] = new Map();
  }

  // Setup initial state: Each city i connects In[i] and Out[i] via "storage" concept logically
  // In our model: City i contributes to CC(In[i]) and CC(Out[i]).
  for (let i = 1; i <= N; i++) {
    const u = i; // In node
    const v = i + N; // Out node

    citiesInCC[u] = 1;
    citiesInCC[v] = 1;

    partners[u].set(v, 1);
    partners[v].set(u, 1);
  }

  // DSU Find with Path Compression
  function find(i) {
    let root = i;
    while (root !== parent[root]) {
      root = parent[root];
    }
    // Path compression step
    let curr = i;
    while (curr !== root) {
      let nextVal = parent[curr];
      parent[curr] = root;
      curr = nextVal;
    }
    return root;
  }

  // DSU Unite with Small-to-Large Merging
  function unite(i, j) {
    let rootI = find(i);
    let rootJ = find(j);

    if (rootI !== rootJ) {
      // Small-to-Large Heuristic: Ensure rootI is the smaller one
      if (partners[rootI].size > partners[rootJ].size) {
        let temp = rootI;
        rootI = rootJ;
        rootJ = temp;
      }

      // 1. Subtract contribution of separate components before merge
      currentAns -= nC2(citiesInCC[rootI]);
      currentAns -= nC2(citiesInCC[rootJ]);

      // 2. Handle intersections involving rootI (the one being merged/consumed)
      // We iterate over all components that intersect with rootI
      for (const [otherCC, count] of partners[rootI]) {
        // Remove the negative contribution (double count correction) of the old intersection {rootI, otherCC}
        currentAns += nC2(count);

        // If otherCC is rootJ, this is the special case: the two components merging actually intersected previously.
        // These 'count' cities are now fully internal to the new merged component.
        if (otherCC === rootJ) {
          // This intersection is disappearing (becoming internal), so we don't add it to the new map.
          // Just proceed.
        } else {
          // For a normal third-party component, we need to move the intersection data to rootJ.

          // First, "add back" the correction for {rootJ, otherCC} because we will update its count
          if (partners[rootJ].has(otherCC)) {
            currentAns += nC2(partners[rootJ].get(otherCC));
          }
        }
      }

      // 3. Calculate cities bridging I and J (they will be subtracted from sum to avoid double counting total cities)
      let citiesBridging = 0;
      if (partners[rootI].has(rootJ)) {
        citiesBridging = partners[rootI].get(rootJ);
        // Remove reference from rootJ side before we start merging maps to avoid confusion
        partners[rootJ].delete(rootI);
      }

      // 4. Update total cities count for the new rootJ
      const newTotalCities =
        citiesInCC[rootI] + citiesInCC[rootJ] - citiesBridging;

      // 5. Merge maps: Move everything from partners[rootI] into partners[rootJ]
      for (const [otherCC, count] of partners[rootI]) {
        if (otherCC === rootJ) continue; // Already handled bridging logic

        // Update rootJ's map
        const currentCountInJ = partners[rootJ].get(otherCC) || 0;
        const newCount = currentCountInJ + count;
        partners[rootJ].set(otherCC, newCount);

        // Update the OTHER side (otherCC needs to know it now points to rootJ, not rootI)
        partners[otherCC].delete(rootI); // Remove link to old dead root
        partners[otherCC].set(rootJ, newCount); // Link to new root

        // Apply new correction (inclusion-exclusion)
        currentAns -= nC2(newCount);
      }

      // Clear the consumed node's map to free memory/state
      partners[rootI].clear();

      // 6. Finalize merge
      parent[rootI] = rootJ;
      citiesInCC[rootJ] = newTotalCities;

      // Add contribution of the new merged component
      currentAns += nC2(newTotalCities);
    }
  }

  // Process Queries
  const results = [];
  for (let k = 0; k < M; k++) {
    const u = parseInt(next(), 10);
    const v = parseInt(next(), 10);

    // Connect In[u] to Out[v]
    // In[u] is index u
    // Out[v] is index v + N
    unite(u, v + N);

    results.push(currentAns);
  }

  console.log(results.join("\n"));
}

solve();
