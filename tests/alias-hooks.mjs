export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    const url = new URL("../node_modules/server-only/empty.js", import.meta.url)
    return nextResolve(url.href, context)
  }
  if (specifier.startsWith("@/")) {
    const url = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url)
    return nextResolve(url.href, context)
  }
  return nextResolve(specifier, context)
}
