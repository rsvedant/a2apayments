import __vite__cjsImport0_react_jsxDevRuntime from "/vendor/.vite-deps-react_jsx-dev-runtime.js__v--4903884e.js"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/vendor/.vite-deps-react.js__v--4903884e.js"; const StrictMode = __vite__cjsImport1_react["StrictMode"];
import __vite__cjsImport2_reactDom_client from "/vendor/.vite-deps-react-dom_client.js__v--4903884e.js"; const createRoot = __vite__cjsImport2_reactDom_client["createRoot"];
import App from "/src/content/views/App.tsx.js";
console.log("[CRXJS] Hello world from content script!");
const container = document.createElement("div");
container.id = "crxjs-app";
document.body.appendChild(container);
createRoot(container).render(
  /* @__PURE__ */ jsxDEV(StrictMode, { children: /* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
    fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/main.tsx",
    lineNumber: 12,
    columnNumber: 5
  }, this) }, void 0, false, {
    fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/main.tsx",
    lineNumber: 11,
    columnNumber: 3
  }, this)
);
