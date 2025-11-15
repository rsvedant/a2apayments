import { createHotContext as __vite__createHotContext } from "/vendor/vite-client.js";import.meta.hot = __vite__createHotContext("/src/content/views/App.tsx.js");import __vite__cjsImport0_react_jsxDevRuntime from "/vendor/.vite-deps-react_jsx-dev-runtime.js__v--4903884e.js"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/vendor/react-refresh.js";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/Users/satvikkapoor/AgentSaleExt/src/content/views/App.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import FloatingCaptions from "/src/content/views/FloatingCaptions.tsx.js";
function App() {
  const isGoogleMeet = window.location.hostname === "meet.google.com";
  if (!isGoogleMeet) {
    return null;
  }
  return /* @__PURE__ */ jsxDEV(FloatingCaptions, {}, void 0, false, {
    fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/App.tsx",
    lineNumber: 30,
    columnNumber: 10
  }, this);
}
_c = App;
export default App;
var _c;
$RefreshReg$(_c, "App");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/satvikkapoor/AgentSaleExt/src/content/views/App.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/satvikkapoor/AgentSaleExt/src/content/views/App.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
