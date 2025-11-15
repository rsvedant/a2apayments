import { createHotContext as __vite__createHotContext } from "/vendor/vite-client.js";import.meta.hot = __vite__createHotContext("/src/content/views/FloatingCaptions.tsx.js");import __vite__cjsImport0_react_jsxDevRuntime from "/vendor/.vite-deps-react_jsx-dev-runtime.js__v--4903884e.js"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/vendor/.vite-deps-react.js__v--4903884e.js"; const useState = __vite__cjsImport3_react["useState"]; const useEffect = __vite__cjsImport3_react["useEffect"]; const useRef = __vite__cjsImport3_react["useRef"];
import { GoogleMeetCaptionController } from "/src/content/views/GoogleMeetCaptionController.ts.js";
import { GeminiService } from "/src/content/services/GeminiService.ts.js";
import "/src/content/views/FloatingCaptions.css.js";
function FloatingCaptions() {
  _s();
  const [captions, setCaptions] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 250 });
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const dragOffset = useRef({ x: 0, y: 0 });
  const controllerRef = useRef(null);
  const geminiServiceRef = useRef(null);
  const captionContainerRef = useRef(null);
  const conversationHistoryRef = useRef([]);
  useEffect(() => {
    const controller = new GoogleMeetCaptionController();
    const geminiService = new GeminiService();
    controllerRef.current = controller;
    geminiServiceRef.current = geminiService;
    setTimeout(() => {
      if (!geminiService.hasApiKey()) {
        setShowApiKeyPrompt(true);
      }
    }, 3e3);
    controller.onCaptionUpdate((newCaptions) => {
      const captionLines = newCaptions.map((caption, index) => ({
        id: `${caption.timestamp}-${index}`,
        text: caption.text,
        timestamp: caption.timestamp
      }));
      setCaptions(captionLines);
      if (captionContainerRef.current) {
        captionContainerRef.current.scrollTop = captionContainerRef.current.scrollHeight;
      }
    });
    controller.onChunkComplete(async (chunk) => {
      console.log("[FloatingCaptions] Processing chunk for suggestions:", chunk.text);
      conversationHistoryRef.current.push(chunk.text);
      if (conversationHistoryRef.current.length > 10) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-10);
      }
      if (geminiService.hasApiKey() && geminiService.canMakeRequest()) {
        setIsLoadingSuggestions(true);
        const result = await geminiService.generateSuggestions(
          chunk.text,
          conversationHistoryRef.current.slice(0, -1)
          // Don't include current chunk
        );
        if (result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
        }
        setIsLoadingSuggestions(false);
      }
    });
    return () => {
      controller.destroy();
    };
  }, []);
  const handleMouseDown = (e) => {
    if (e.target.closest(".floating-captions-header")) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    }
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  const clearCaptions = () => {
    setCaptions([]);
  };
  const handleApiKeySubmit = async () => {
    if (apiKeyInput.trim() && geminiServiceRef.current) {
      await geminiServiceRef.current.setApiKey(apiKeyInput.trim());
      setShowApiKeyPrompt(false);
      setApiKeyInput("");
    }
  };
  const copySuggestion = (suggestion) => {
    navigator.clipboard.writeText(suggestion);
    console.log("[FloatingCaptions] Copied suggestion:", suggestion);
  };
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    showApiKeyPrompt && /* @__PURE__ */ jsxDEV("div", { className: "api-key-prompt", children: /* @__PURE__ */ jsxDEV("div", { className: "api-key-prompt-content", children: [
      /* @__PURE__ */ jsxDEV("h3", { children: "Configure Gemini API Key" }, void 0, false, {
        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
        lineNumber: 172,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { children: "Enter your Google Gemini API key to enable AI-powered suggestions." }, void 0, false, {
        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
        lineNumber: 173,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "password",
          placeholder: "Enter your API key...",
          value: apiKeyInput,
          onChange: (e) => setApiKeyInput(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && handleApiKeySubmit()
        },
        void 0,
        false,
        {
          fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
          lineNumber: 174,
          columnNumber: 13
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "api-key-prompt-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { onClick: handleApiKeySubmit, children: "Save" }, void 0, false, {
          fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
          lineNumber: 182,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("button", { onClick: () => setShowApiKeyPrompt(false), children: "Skip" }, void 0, false, {
          fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
          lineNumber: 183,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
        lineNumber: 181,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("small", { children: [
        "Get your API key from ",
        /* @__PURE__ */ jsxDEV("a", { href: "https://aistudio.google.com/apikey", target: "_blank", rel: "noopener noreferrer", children: "Google AI Studio" }, void 0, false, {
          fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
          lineNumber: 185,
          columnNumber: 42
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
        lineNumber: 185,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
      lineNumber: 171,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
      lineNumber: 170,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: `floating-captions ${isDragging ? "dragging" : ""}`,
        style: {
          left: `${position.x}px`,
          top: `${position.y}px`
        },
        onMouseDown: handleMouseDown,
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "floating-captions-header", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "floating-captions-title", children: [
              /* @__PURE__ */ jsxDEV(
                "svg",
                {
                  width: "16",
                  height: "16",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  children: [
                    /* @__PURE__ */ jsxDEV("rect", { x: "2", y: "2", width: "20", height: "20", rx: "2" }, void 0, false, {
                      fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                      lineNumber: 209,
                      columnNumber: 13
                    }, this),
                    /* @__PURE__ */ jsxDEV("path", { d: "M8 12h8M8 16h8" }, void 0, false, {
                      fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                      lineNumber: 210,
                      columnNumber: 13
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                  lineNumber: 201,
                  columnNumber: 11
                },
                this
              ),
              "Captions"
            ] }, void 0, true, {
              fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
              lineNumber: 200,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "floating-captions-controls", children: [
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  className: "caption-control-btn",
                  onClick: clearCaptions,
                  title: "Clear captions",
                  children: /* @__PURE__ */ jsxDEV(
                    "svg",
                    {
                      width: "14",
                      height: "14",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      children: [
                        /* @__PURE__ */ jsxDEV("polyline", { points: "3 6 5 6 21 6" }, void 0, false, {
                          fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                          lineNumber: 228,
                          columnNumber: 15
                        }, this),
                        /* @__PURE__ */ jsxDEV("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }, void 0, false, {
                          fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                          lineNumber: 229,
                          columnNumber: 15
                        }, this)
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                      lineNumber: 220,
                      columnNumber: 13
                    },
                    this
                  )
                },
                void 0,
                false,
                {
                  fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                  lineNumber: 215,
                  columnNumber: 11
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  className: "caption-control-btn",
                  onClick: toggleVisibility,
                  title: isVisible ? "Minimize" : "Maximize",
                  children: /* @__PURE__ */ jsxDEV(
                    "svg",
                    {
                      width: "14",
                      height: "14",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      children: isVisible ? /* @__PURE__ */ jsxDEV("polyline", { points: "4 14 10 14 10 20" }, void 0, false, {
                        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                        lineNumber: 246,
                        columnNumber: 17
                      }, this) : /* @__PURE__ */ jsxDEV("polyline", { points: "15 3 21 3 21 9" }, void 0, false, {
                        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                        lineNumber: 248,
                        columnNumber: 17
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                      lineNumber: 237,
                      columnNumber: 13
                    },
                    this
                  )
                },
                void 0,
                false,
                {
                  fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                  lineNumber: 232,
                  columnNumber: 11
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
              lineNumber: 214,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
            lineNumber: 199,
            columnNumber: 7
          }, this),
          isVisible && /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV("div", { className: "floating-captions-content", ref: captionContainerRef, children: captions.length === 0 ? /* @__PURE__ */ jsxDEV("div", { className: "floating-captions-empty", children: "Waiting for captions..." }, void 0, false, {
              fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
              lineNumber: 259,
              columnNumber: 13
            }, this) : /* @__PURE__ */ jsxDEV("div", { className: "floating-captions-list", children: captions.map(
              (caption) => /* @__PURE__ */ jsxDEV("div", { className: "caption-line", children: caption.text }, caption.id, false, {
                fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                lineNumber: 265,
                columnNumber: 15
              }, this)
            ) }, void 0, false, {
              fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
              lineNumber: 263,
              columnNumber: 13
            }, this) }, void 0, false, {
              fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
              lineNumber: 257,
              columnNumber: 11
            }, this),
            (suggestions.length > 0 || isLoadingSuggestions) && /* @__PURE__ */ jsxDEV("div", { className: "ai-suggestions-section", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "ai-suggestions-header", children: [
                /* @__PURE__ */ jsxDEV("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                  /* @__PURE__ */ jsxDEV("path", { d: "M12 2L2 7l10 5 10-5-10-5z" }, void 0, false, {
                    fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                    lineNumber: 278,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("path", { d: "M2 17l10 5 10-5M2 12l10 5 10-5" }, void 0, false, {
                    fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                    lineNumber: 279,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                  lineNumber: 277,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: "AI Suggestions" }, void 0, false, {
                  fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                  lineNumber: 281,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                lineNumber: 276,
                columnNumber: 15
              }, this),
              isLoadingSuggestions ? /* @__PURE__ */ jsxDEV("div", { className: "ai-suggestions-loading", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "loading-spinner" }, void 0, false, {
                  fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                  lineNumber: 286,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: "Generating suggestions..." }, void 0, false, {
                  fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                  lineNumber: 287,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                lineNumber: 285,
                columnNumber: 13
              }, this) : /* @__PURE__ */ jsxDEV("div", { className: "ai-suggestions-list", children: suggestions.map(
                (suggestion, index) => /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    className: "ai-suggestion-item",
                    onClick: () => copySuggestion(suggestion),
                    title: "Click to copy",
                    children: [
                      /* @__PURE__ */ jsxDEV("span", { className: "suggestion-number", children: index + 1 }, void 0, false, {
                        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                        lineNumber: 298,
                        columnNumber: 23
                      }, this),
                      /* @__PURE__ */ jsxDEV("span", { className: "suggestion-text", children: suggestion }, void 0, false, {
                        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                        lineNumber: 299,
                        columnNumber: 23
                      }, this),
                      /* @__PURE__ */ jsxDEV("svg", { className: "copy-icon", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                        /* @__PURE__ */ jsxDEV("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }, void 0, false, {
                          fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                          lineNumber: 301,
                          columnNumber: 25
                        }, this),
                        /* @__PURE__ */ jsxDEV("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }, void 0, false, {
                          fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                          lineNumber: 302,
                          columnNumber: 25
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                        lineNumber: 300,
                        columnNumber: 23
                      }, this)
                    ]
                  },
                  index,
                  true,
                  {
                    fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                    lineNumber: 292,
                    columnNumber: 15
                  },
                  this
                )
              ) }, void 0, false, {
                fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
                lineNumber: 290,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
              lineNumber: 275,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
            lineNumber: 256,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
        lineNumber: 191,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx",
    lineNumber: 167,
    columnNumber: 5
  }, this);
}
_s(FloatingCaptions, "wgvaV+b3rt70MRBZbFouOSFF0Ac=");
_c = FloatingCaptions;
export default FloatingCaptions;
var _c;
$RefreshReg$(_c, "FloatingCaptions");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/satvikkapoor/AgentSaleExt/src/content/views/FloatingCaptions.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
