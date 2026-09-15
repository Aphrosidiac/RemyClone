(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
  "object" == typeof document ? document.currentScript : void 0,
  56029,
  (e) => {
    "use strict";
    var t = e.i(43476),
      r = e.i(71645),
      n = e.i(89970),
      i = e.i(67037),
      a = e.i(14707),
      s = e.i(69956),
      l = e.i(12993),
      o = e.i(76569);
    let u = {
      toggle: "",
      "rolling-out": "is-hand-rolling-out",
      loading: "is-hand-loading",
      preview: "is-hand-live",
      "preview-out": "is-hand-live is-hand-leaving",
      "rolling-in": "is-hand-rolling-in",
    };
    function c() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    function d() {
      return new Promise((e) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => e());
        });
      });
    }
    async function f(e) {
      (e.readyState >= 2 && e.videoWidth > 0) ||
        (await new Promise((t) => {
          let r = () => {
            (e.removeEventListener("loadeddata", r), t());
          };
          e.addEventListener("loadeddata", r, { once: !0 });
        }));
    }
    let p = { off: "[off]", loading: "[…]", on: "[on]", error: "[n/a]" };
    function h(e) {
      let t = !1;
      return {
        reset() {
          t = !1;
        },
        sample: (r) => (
          !t && r < 1.25 ? ((t = !0), e?.()) : t && r > 1.55 && (t = !1),
          t
        ),
      };
    }
    function m(e) {
      let t = Math.hypot(e[0].x - e[9].x, e[0].y - e[9].y) || 1,
        r = [8, 12, 16, 20],
        n =
          r.reduce(
            (t, r) => t + Math.hypot(e[r].x - e[0].x, e[r].y - e[0].y),
            0,
          ) /
          (r.length * t);
      return { handSize: t, reach: n };
    }
    function y(e) {
      return {
        x: (e[0].x + e[5].x + e[9].x + e[13].x + e[17].x) / 5,
        y: (e[0].y + e[5].y + e[9].y + e[13].y + e[17].y) / 5,
      };
    }
    function g(e) {
      let t = Math.hypot(e[0].x - e[9].x, e[0].y - e[9].y) || 1,
        r = (r, n) => Math.hypot(e[r].x - e[n].x, e[r].y - e[n].y) / t,
        n = r(8, 0) > 1.55,
        i = 1.3 > r(12, 0) && 1.25 > r(16, 0) && 1.25 > r(20, 0),
        a = r(4, 5) > 0.65;
      if (!n || !i || !a) return !1;
      let s = { x: e[8].x - e[5].x, y: e[8].y - e[5].y },
        l = { x: e[4].x - e[2].x, y: e[4].y - e[2].y };
      return (
        0.65 >
        Math.abs(
          (s.x * l.x + s.y * l.y) /
            (Math.hypot(s.x, s.y) * Math.hypot(l.x, l.y) || 1),
        )
      );
    }
    e.s([
      "createClenchDetector",
      0,
      h,
      "default",
      0,
      function ({
        onFrame: v,
        onSecondClench: w,
        onPinch: x,
        onSquareGesture: b,
        onStatus: j,
        ref: O,
      }) {
        let [k, E] = (0, r.useState)("off"),
          [R, T] = (0, r.useState)("toggle"),
          M = (0, r.useRef)(k);
        M.current = k;
        let L = (0, r.useRef)("toggle"),
          A = (e) => {
            ((L.current = e), T(e));
          },
          P = (0, r.useRef)(null),
          F = (0, r.useRef)(null),
          I = (0, r.useRef)(null),
          S = (0, r.useRef)(!1),
          $ = (0, r.useRef)(null),
          q = (0, r.useRef)(null),
          C = (0, r.useRef)(null),
          N = (0, r.useRef)(w),
          H = (0, r.useRef)(x),
          D = (0, r.useRef)(b),
          G = (0, r.useRef)(0),
          U = (0, r.useRef)(0);
        ((0, r.useEffect)(() => {
          ((N.current = w), (H.current = x), (D.current = b));
        }, [w, x, b]),
          (0, r.useEffect)(() => () => C.current?.(), []),
          (0, l.useIsoLayoutEffect)(() => {
            let e = P.current;
            if (!e) return;
            let t = e.closest(".project-page");
            if (!t) return;
            let r = () => {
              t.classList.contains("gestures-on") &&
                e.classList.contains("is-running") &&
                n.default.set(e, { opacity: 1, y: 0, yPercent: 0 });
            };
            r();
            let i = new MutationObserver(r);
            i.observe(t, { attributes: !0, attributeFilter: ["class"] });
            let a = new MutationObserver(r);
            return (
              a.observe(e, { attributes: !0, attributeFilter: ["class"] }),
              () => {
                (i.disconnect(), a.disconnect());
              }
            );
          }, []),
          (0, r.useEffect)(() => {
            "preview" !== R && q.current?.classList.remove("is-visible");
          }, [R]),
          (0, l.useIsoLayoutEffect)(() => {
            if ("rolling-in" !== R) return;
            let e = F.current;
            !e ||
              c() ||
              e.querySelectorAll(".roll-inner").forEach((e) => {
                ((e.style.transition = "none"),
                  (e.style.transitionDelay = ""),
                  (e.style.transform = "translateY(110%)"));
              });
          }, [R]),
          (0, l.useIsoLayoutEffect)(() => {
            let e = I.current;
            if (e) {
              if ("preview" !== R) {
                "preview-out" !== R &&
                  (n.default.killTweensOf(e),
                  n.default.set(e, {
                    clearProps: "scale,opacity,transformOrigin",
                  }));
                return;
              }
              if (!S.current || ((S.current = !1), c()))
                return void n.default.set(e, { scale: 1, opacity: 1 });
              n.default.fromTo(
                e,
                { scale: 0, opacity: 0, transformOrigin: "50% 50%" },
                {
                  scale: 1,
                  opacity: 1,
                  duration: 0.6,
                  ease: "power3.out",
                  overwrite: !0,
                },
              );
            }
          }, [R]));
        let W = (e) => {
            (E(e), j?.("on" === e));
          },
          B = () => {
            (C.current?.(), (C.current = null));
          },
          V = () => {
            U.current += 1;
          },
          Y = async (t) => {
            let r = ++U.current,
              n = null;
            try {
              let { FilesetResolver: t, HandLandmarker: i } = await e.A(26368);
              if (
                ((n = await navigator.mediaDevices.getUserMedia({
                  video: { width: 1280, height: 720, facingMode: "user" },
                })),
                r !== U.current)
              )
                return void n.getTracks().forEach((e) => e.stop());
              let a = $.current;
              if (!a) throw Error("video element missing");
              ((a.srcObject = n), await a.play(), await f(a));
              let s = await t.forVisionTasks("/mediapipe/wasm"),
                l = await i.createFromOptions(s, {
                  baseOptions: {
                    modelAssetPath: "/mediapipe/hand_landmarker.task",
                    delegate: "GPU",
                  },
                  runningMode: "VIDEO",
                  numHands: 2,
                });
              if (r !== U.current) {
                (l.close(),
                  n.getTracks().forEach((e) => e.stop()),
                  (a.srcObject = null));
                return;
              }
              let o = !1,
                u = 0,
                c = -1,
                d = 0,
                p = h(),
                w = h(() => N.current()),
                x = null,
                b = !1,
                j = 0,
                O = -1 / 0,
                k = () => {
                  if (!o) {
                    if (document.hidden) {
                      u = requestAnimationFrame(k);
                      return;
                    }
                    if (a.readyState >= 2 && a.currentTime !== c) {
                      if ((d ^= 1)) {
                        ((c = a.currentTime), (u = requestAnimationFrame(k)));
                        return;
                      }
                      c = a.currentTime;
                      let e = performance.now(),
                        t = l.detectForVideo(a, e).landmarks ?? [];
                      if (t.length > 0) {
                        let r = t.map(y),
                          n = 0;
                        if (x && r.length > 1) {
                          let e = r.map((e) =>
                            Math.hypot(e.x - x.x, e.y - x.y),
                          );
                          n = +(e[1] < e[0]);
                        }
                        let i = t[n],
                          a = t.map(g),
                          { handSize: s, reach: l } = m(i),
                          o = p.sample(a[n] ? 99 : l),
                          u = Math.hypot(i[4].x - i[8].x, i[4].y - i[8].y) / s;
                        !b && !o && l > 1.35 && u < 0.28
                          ? ((b = !0), H.current())
                          : b && (u > 0.5 || o) && (b = !1);
                        let c = t[1 - n];
                        (c ? w.sample(a[1 - n] ? 99 : m(c).reach) : w.reset(),
                          a.some(Boolean)
                            ? ++j >= 8 &&
                              e - O > 4e3 &&
                              ((O = e), (j = 0), D.current())
                            : (j = 0),
                          (x = r[n]),
                          v(x.x, x.y, !0, o));
                      } else
                        (p.reset(),
                          w.reset(),
                          (x = null),
                          (b = !1),
                          v(0.5, 0.5, !1, !1));
                    }
                    u = requestAnimationFrame(k);
                  }
                };
              ((u = requestAnimationFrame(k)),
                (C.current = () => {
                  ((o = !0),
                    cancelAnimationFrame(u),
                    l.close(),
                    n?.getTracks().forEach((e) => e.stop()),
                    (a.srcObject = null),
                    v(0.5, 0.5, !1, !1));
                }),
                (S.current = !0),
                A("preview"),
                W("on"));
            } catch (e) {
              if (
                (console.warn("Hand control unavailable:", e),
                n?.getTracks().forEach((e) => e.stop()),
                $.current && ($.current.srcObject = null),
                v(0.5, 0.5, !1, !1),
                r !== U.current)
              )
                return;
              (t && (0, a.setGesturesOn)(!1),
                W("error"),
                t ? await K() : A("toggle"));
            }
          },
          K = async (e) => {
            let t = e ?? ++G.current;
            (A("rolling-in"), await d());
            let r = F.current;
            if (!r || t !== G.current) {
              t === G.current && A("toggle");
              return;
            }
            c()
              ? A("toggle")
              : (await (0, i.playRollAll)(r, "in", { force: !0 }),
                t === G.current && (await d(), A("toggle")));
          },
          X = async () => {
            let e = ++G.current;
            (V(), "error" === M.current && W("off"), A("rolling-out"));
            let t = F.current;
            if (!t || c()) {
              if (e !== G.current) return;
              (A("loading"), W("loading"), await Y(!0));
              return;
            }
            (await (0, i.playRollAll)(t, "out", { force: !0 }),
              e !== G.current ||
                (A("loading"),
                W("loading"),
                await d(),
                e === G.current && (await Y(!0))));
          },
          z = async () => {
            let e = ++G.current;
            (V(), A("preview-out"), q.current?.classList.remove("is-visible"));
            let t = I.current;
            if (!t || c()) {
              if (e !== G.current) return;
              (B(), W("off"), await K(e));
              return;
            }
            (await new Promise((e) => {
              n.default.to(t, {
                scale: 0,
                opacity: 0,
                duration: 0.5,
                ease: "power3.inOut",
                transformOrigin: "50% 50%",
                onComplete: e,
              });
            }),
              e !== G.current ||
                (B(),
                n.default.set(t, { scale: 0, opacity: 0 }),
                W("off"),
                await d(),
                e === G.current && (await K(e))));
          },
          _ = (0, r.useRef)(!1);
        (0, r.useEffect)(() => {
          !_.current &&
            (0, a.gesturesWanted)() &&
            (0, a.gesturesSupported)() &&
            ((_.current = !0), A("loading"), W("loading"), Y(!1));
        }, []);
        let J = () => {
          let e = L.current;
          ("toggle" === e || "preview" === e) &&
            ("preview" === e
              ? ((0, a.setGesturesOn)(!1), z())
              : ((0, a.setGesturesOn)(!0), X()));
        };
        (0, r.useImperativeHandle)(O, () => ({
          toggle: J,
          aimHint: (e, t, r = !0) => {
            let n = q.current;
            if (n) {
              if ("preview" !== L.current || !r)
                return void n.classList.remove("is-visible");
              (0, s.isOverHandPreview)(e, t)
                ? ((n.style.transform = `translate3d(${e}px, ${t}px, 0)`),
                  n.classList.add("is-visible"))
                : n.classList.remove("is-visible");
            }
          },
          capture: () => {
            let e = $.current;
            if (!e || e.readyState < 2 || !e.videoWidth) return null;
            let t = document.createElement("canvas");
            ((t.width = e.videoWidth), (t.height = e.videoHeight));
            let r = t.getContext("2d");
            return r
              ? (r.translate(t.width, 0),
                r.scale(-1, 1),
                r.drawImage(e, 0, 0),
                t)
              : null;
          },
        }));
        let Q = "preview" === R || "preview-out" === R || "rolling-in" === R,
          Z = "preview" === R || "preview-out" === R,
          ee = "toggle" === R,
          et = u[R],
          er = (e, t) => {
            let r = q.current;
            r &&
              "preview" === L.current &&
              ((r.style.transform = `translate3d(${e}px, ${t}px, 0)`),
              r.classList.add("is-visible"));
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsxs)("div", {
              ref: P,
              className: `hand-control${Q ? " is-running" : ""}${et ? ` ${et}` : ""}`,
              "data-reveal": "foot",
              children: [
                (0, t.jsxs)("button", {
                  ref: F,
                  type: "button",
                  className: "hand-toggle",
                  onMouseEnter: o.playTick,
                  onClick: () => {
                    ee && ((0, o.playTick)(), J());
                  },
                  "aria-pressed": !1,
                  "aria-busy": "rolling-out" === R || "rolling-in" === R,
                  "aria-hidden":
                    !ee && "rolling-out" !== R && "rolling-in" !== R,
                  tabIndex: ee ? 0 : -1,
                  children: [
                    (0, t.jsx)("span", {
                      className: "reveal-mask",
                      children: (0, t.jsx)("span", {
                        "data-reveal": "line",
                        children: (0, t.jsx)(i.default, {
                          children: "gestures:",
                        }),
                      }),
                    }),
                    (0, t.jsx)("span", {
                      className: "reveal-mask",
                      children: (0, t.jsx)("span", {
                        "data-reveal": "line",
                        children: (0, t.jsx)(i.default, { children: p[k] }),
                      }),
                    }),
                  ],
                }),
                (0, t.jsx)("button", {
                  ref: I,
                  type: "button",
                  className: `hand-preview${Z ? " is-visible" : " is-offscreen"}`,
                  onPointerEnter: (e) => {
                    Z && ((0, o.playTick)(), er(e.clientX, e.clientY));
                  },
                  onPointerMove: (e) => {
                    "preview" === L.current && er(e.clientX, e.clientY);
                  },
                  onPointerLeave: () =>
                    q.current?.classList.remove("is-visible"),
                  onClick: () => {
                    "preview" === L.current && ((0, o.playTick)(), J());
                  },
                  "aria-label": "Turn off gestures",
                  "aria-hidden": !Z,
                  tabIndex: Z ? 0 : -1,
                  children: (0, t.jsx)("video", {
                    ref: $,
                    className: "hand-video",
                    muted: !0,
                    playsInline: !0,
                    "aria-hidden": "true",
                  }),
                }),
              ],
            }),
            (0, t.jsx)("span", {
              ref: q,
              className: "hand-preview-hint cursor-hint",
              "aria-hidden": "true",
              children: "turn off",
            }),
          ],
        });
      },
    ]);
  },
  27795,
  (e) => {
    e.n(e.i(56029));
  },
  26368,
  (e) => {
    e.v((t) =>
      Promise.all(["static/chunks/42ztmr69bkojl.js"].map((t) => e.l(t))).then(
        () => t(57166),
      ),
    );
  },
]);
