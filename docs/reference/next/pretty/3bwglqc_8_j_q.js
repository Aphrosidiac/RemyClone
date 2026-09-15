(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
  "object" == typeof document ? document.currentScript : void 0,
  51735,
  (e) => {
    "use strict";
    var t = e.i(43476),
      r = e.i(71645),
      n = e.i(25234),
      i = e.i(89970),
      u = e.i(21606),
      l = e.i(76569),
      a = e.i(21307),
      o = e.i(56910),
      c = e.i(67929),
      s = e.i(49713),
      d = e.i(57265),
      g = e.i(90096),
      f = e.i(12594);
    let m = Array.from({ length: 41 }, (e, t) => t - 20),
      h = Array.from({ length: 25 }, (e, t) => t - 12);
    function T() {
      let e = window.innerWidth / Math.max(1, window.innerHeight),
        { visibleW: t, visibleH: r } = (0, c.visibleSize)(e),
        { cellW: n, cellH: i } = y(e, w);
      return { cols: (0, a.tilePool)(t, n), rows: (0, a.tilePool)(r, i) };
    }
    let w = a.VIEW_ZOOM,
      x = 0.81 * w;
    function p(e, t, r) {
      return (0, a.mod)(t + r, e.items.length || 1);
    }
    function y(e, t) {
      let { visibleW: r, visibleH: n } = (0, c.visibleSize)(e),
        i = (0, c.lensCellScale)(),
        u = (0, a.tileWorldSize)(r, n, i),
        l = u.w * t,
        o = u.h * t;
      return { cellW: l, cellH: o, pitchX: l, pitchY: o, visibleW: r };
    }
    function v(e, t, r, n) {
      let { pitchX: i, pitchY: u } = y(e, t),
        { visibleW: l, visibleH: a } = (0, c.visibleSize)(e);
      return { pitchXpx: (i / l) * r, pitchYpx: (u / a) * n };
    }
    function M({
      col: e,
      row: u,
      cols: l,
      rows: o,
      sim: s,
      textures: d,
      ensure: m,
    }) {
      let h = (0, r.useRef)(null),
        T = (0, r.useRef)(null),
        w = (0, r.useRef)(null),
        x = (0, r.useRef)(null),
        v = (0, r.useRef)({ o: 1, s: 1 });
      return (
        (0, n.useFrame)(() => {
          if (!h.current || !T.current || !w.current) return;
          x.current || (x.current = (0, f.applyTileCover)(w.current));
          let t = s.current,
            r = window.innerWidth / Math.max(1, window.innerHeight),
            { cellW: n, cellH: M, pitchX: b, pitchY: E } = y(r, t.zoom),
            R = i.default.utils.wrap(-l / 2, l / 2, e - t.gx),
            z = i.default.utils.wrap(-o / 2, o / 2, u - t.gy),
            { visibleW: A, visibleH: I } = (0, c.visibleSize)(r),
            _ = "x" === t.buildAxis,
            C = (0, a.bandOffset)(
              t.buildT,
              Math.round(_ ? R : z),
              _ ? A / 2 + n : I / 2 + M,
              t.buildDir,
            ),
            S = -(z * E + (_ ? 0 : C)),
            k = Math.round(t.gx + R),
            j = Math.round(t.gy + z),
            L = t.items[p(t, k, j)] ?? 0,
            N = t.filterT;
          ((v.current.o = N), (v.current.s = 1));
          let O = R * b + (_ ? C : 0);
          (h.current.position.set(O, S, 0), m(L));
          let P =
            (k === Math.round(t.gx) && j === Math.round(t.gy)
              ? (0, g.previewTextureFor)(L)
              : null) ??
            d[L] ??
            d[0];
          w.current.map !== P &&
            ((w.current.map = P),
            w.current.color.set("#ffffff"),
            (w.current.needsUpdate = !0));
          let W = !(
            Math.abs(O) > A / 2 + n ||
            Math.abs(S) > I / 2 + M ||
            (!(N > 0.01) && v.current.o < 0.01)
          );
          if (
            ((T.current.visible = W && v.current.o * t.fade > 0.01),
            !T.current.visible)
          )
            return;
          (x.current.setParallax(
            (0, a.parallaxNorm)(O, A / 2),
            (0, a.parallaxNorm)(S, I / 2),
          ),
            T.current.scale.set(n * v.current.s, M * v.current.s, 1));
          let F = i.default.utils.clamp(
            0,
            1,
            1 - Math.max(Math.abs(R), Math.abs(z)),
          );
          ((w.current.opacity =
            v.current.o *
            t.fade *
            (a.INACTIVE_OPACITY + (1 - a.INACTIVE_OPACITY) * F)),
            x.current.setSaturation(a.INACTIVE_SAT + (1 - a.INACTIVE_SAT) * F),
            x.current.set(n / M));
        }),
        (0, t.jsx)("group", {
          ref: h,
          children: (0, t.jsxs)("mesh", {
            ref: T,
            children: [
              (0, t.jsx)("planeGeometry", { args: [1, 1] }),
              (0, t.jsx)("meshBasicMaterial", {
                ref: w,
                color: "#111111",
                transparent: !0,
                toneMapped: !1,
                depthWrite: !1,
              }),
            ],
          }),
        })
      );
    }
    function b({ sim: e, hiddenRef: i, ringRef: u, onTick: o }) {
      let c = (0, r.useRef)({ c: 0, r: 0 }),
        { textures: s, ensure: g } = (0, d.useProjectTextures)(),
        [f, m] = (0, r.useState)(T);
      (0, r.useEffect)(() => {
        let e = () => {
          let e = T();
          m((t) => (t.cols === e.cols && t.rows === e.rows ? t : e));
        };
        return (
          window.addEventListener("resize", e),
          () => window.removeEventListener("resize", e)
        );
      }, []);
      let h = (0, r.useMemo)(() => (0, a.poolSlots)(f.cols), [f.cols]),
        w = (0, r.useMemo)(() => (0, a.poolSlots)(f.rows), [f.rows]);
      return (
        (0, r.useEffect)(() => {
          u.current = f;
        }, [f, u]),
        (0, n.useFrame)((t, r) => {
          let n = e.current,
            u = (0, a.easeFactor)(1e3 * r);
          ((n.gx += (n.gxTarget - n.gx) * u),
            (n.gy += (n.gyTarget - n.gy) * u),
            (n.zoom += (n.zoomTarget - n.zoom) * u),
            i.current || o(n.gx, n.gy));
          let s = Math.round(n.gx),
            d = Math.round(n.gy);
          if (s !== c.current.c || d !== c.current.r) {
            let e = Math.abs(s - c.current.c) + Math.abs(d - c.current.r);
            (!i.current && e <= 2 && (0, l.playTick)(),
              (c.current = { c: s, r: d }));
          }
        }),
        (0, t.jsx)("group", {
          children: h.map((r) =>
            w.map((n) =>
              (0, t.jsx)(
                M,
                {
                  col: r,
                  row: n,
                  cols: h.length,
                  rows: w.length,
                  sim: e,
                  textures: s,
                  ensure: g,
                },
                `${r}:${n}`,
              ),
            ),
          ),
        })
      );
    }
    e.s([
      "default",
      0,
      function ({ ref: e, hidden: n }) {
        let l = (0, u.useProjects)(),
          d = l.length,
          f = (0, r.useRef)(null),
          T = (0, r.useRef)(n),
          M = (0, r.useRef)(0),
          E = (0, r.useRef)({ cols: 5, rows: 5 }),
          R = (0, r.useRef)({
            top: null,
            bottom: null,
            left: null,
            right: null,
          }),
          z = (0, r.useRef)({
            gx: 0,
            gy: 0,
            gxTarget: 0,
            gyTarget: 0,
            zoom: w,
            zoomTarget: w,
            n: d,
            items: l.map((e, t) => t),
            filter: [],
            filterT: 1,
            filterUntil: 0,
            fade: 1,
            interactive: !0,
            buildT: 1e4,
            buildAxis: "y",
            buildDir: "in",
          }),
          A = (e, t, r) => {
            if (!e) return;
            let n = e.el.getBoundingClientRect(),
              i = "x" === r ? n.width : n.height;
            if (i <= 0) return;
            let u = (0, a.tickScale)(window.innerWidth),
              l = a.TICK_PITCH * u,
              o = (0, a.tickRowWidth)(l),
              c = Math.round(t),
              s = t - c,
              d = "x" === r ? m : h;
            for (let t = 0; t < d.length; t++) {
              let n = e.groups[t];
              if (!n) continue;
              let u = d[t] - s;
              if (Math.abs(u) * l > i / 2 + l) {
                n.style.visibility = "hidden";
                continue;
              }
              let c = i / 2 + u * l - o / 2;
              ((n.style.visibility = "visible"),
                "x" === r
                  ? ((n.style.width = `${o}px`),
                    (n.style.transform = `translate3d(${c}px, 0, 0)`))
                  : ((n.style.height = `${o}px`),
                    (n.style.transform = `translate3d(0, ${c}px, 0)`)));
              let g = e.marks[t];
              if (!g) continue;
              let f = (o - a.TICK_W) / (a.TICKS_PER_GROUP - 1);
              for (let e = 0; e < g.length; e++) {
                let t = c + e * f;
                g[e].style.visibility =
                  t < 0 || t > i - a.TICK_W ? "hidden" : "visible";
              }
            }
          },
          I = (0, r.useCallback)((e, t) => {
            (A(R.current.top, e, "x"),
              A(R.current.bottom, e, "x"),
              A(R.current.left, t, "y"),
              A(R.current.right, t, "y"));
          }, []),
          _ = (0, r.useCallback)(() => {
            let e = z.current;
            return (
              (0, g.isMotionPreviewPlaying)() ||
              Math.abs(e.gxTarget - e.gx) > 5e-4 ||
              Math.abs(e.gyTarget - e.gy) > 5e-4 ||
              Math.abs(e.zoomTarget - e.zoom) > 5e-4 ||
              performance.now() < e.filterUntil ||
              i.default.isTweening(e)
            );
          }, []);
        (0, r.useEffect)(() => {}, []);
        let C = (0, r.useRef)(!1),
          S = (0, r.useRef)(null),
          k = (0, r.useCallback)((e) => {
            S.current = e;
          }, []),
          { awake: j, wake: L } = (0, s.useIdleFrameloop)(_, n),
          N = (0, r.useCallback)(() => {
            ((C.current = !0), L({ graceMs: s.WAKE_GRACE_MS }));
          }, [L]),
          O = (0, r.useCallback)(
            (e, t, r = !0) => {
              let n = z.current;
              ((n.buildAxis = "slider" === e ? "y" : "x"), (n.buildDir = t));
              let u = "slider" === e ? E.current.rows : E.current.cols,
                l = (0, a.bandedDuration)(Math.max(3, u - 2), t),
                o = "in" === t;
              if (
                (i.default.killTweensOf(n, "buildT,zoom,zoomTarget"),
                (n.buildT = o ? 0 : l),
                (n.zoom = n.zoomTarget = o ? 1 : w),
                !r)
              )
                return (L(), l);
              i.default.to(n, { buildT: o ? l : 0, duration: l, ease: "none" });
              let c = o ? w : 1;
              return (
                i.default.to(n, {
                  zoom: c,
                  zoomTarget: c,
                  duration: l,
                  ease: a.VIEW_EASE,
                }),
                L({ graceMs: 1e3 * l + 200 }),
                l
              );
            },
            [L],
          ),
          P = (0, r.useCallback)(
            (e = 600) => {
              (window.clearTimeout(M.current),
                (M.current = window.setTimeout(() => {
                  (z.current.zoom < 1.2 &&
                    ((z.current.gxTarget = Math.round(z.current.gxTarget)),
                    (z.current.gyTarget = Math.round(z.current.gyTarget))),
                    L());
                }, e)));
            },
            [L],
          );
        return (
          (0, r.useImperativeHandle)(e, () => ({
            isReady: () => C.current,
            renderNow: () => S.current?.(performance.now()),
            setCenterProject: (e) => {
              (!(function (e, t) {
                let r = e.items.length || 1,
                  n = Math.round(e.gx),
                  i = Math.round(e.gy),
                  u = e.items.indexOf(t);
                if (u >= 0) {
                  let e = (0, a.mod)(u - (0, a.mod)(n + i, r), r);
                  (e > r / 2 && (e -= r), (i += e));
                }
                ((e.gx = e.gxTarget = n), (e.gy = e.gyTarget = i));
              })(z.current, e),
                L());
            },
            activeProject: () => {
              let e = z.current;
              return e.items[p(e, Math.round(e.gx), Math.round(e.gy))] ?? 0;
            },
            setItems: (e, t) => {
              let r = z.current;
              i.default.killTweensOf(r);
              let n = () => {
                ((r.items = e),
                  (r.gx = r.gxTarget = 0),
                  (r.gy = r.gyTarget = 0));
              };
              if (!t) {
                (n(), (r.filterT = 1), L());
                return;
              }
              ((r.filterUntil =
                performance.now() + (a.FILTER_ENTER_S + 0.3) * 1e3),
                L({ graceMs: (a.FILTER_ENTER_S + 0.3) * 1e3 }),
                i.default.to(r, {
                  filterT: 0,
                  duration: a.FILTER_ENTER_S / 2,
                  ease: a.VIEW_MOVE_EASE,
                  onComplete: () => {
                    (n(),
                      i.default.to(r, {
                        filterT: 1,
                        duration: a.FILTER_ENTER_S / 2,
                        ease: a.VIEW_MOVE_EASE,
                        onUpdate: L,
                      }));
                  },
                }));
            },
            centerRect: () =>
              ((e, t, r = z.current.zoom) => {
                let n = window.innerWidth,
                  i = window.innerHeight,
                  {
                    cellW: u,
                    cellH: l,
                    pitchX: a,
                    pitchY: o,
                  } = y(n / Math.max(1, i), r);
                return (0, c.worldRectToScreen)(
                  (e - z.current.gx) * a,
                  -(t - z.current.gy) * o,
                  u,
                  l,
                  n,
                  i,
                );
              })(Math.round(z.current.gx), Math.round(z.current.gy)),
            dragBy: (e, t) => {
              if (!z.current.interactive) return;
              let r = window.innerWidth,
                n = window.innerHeight,
                { pitchXpx: i, pitchYpx: u } = v(
                  r / Math.max(1, n),
                  z.current.zoom,
                  r,
                  n,
                );
              ((z.current.gxTarget -= e / i),
                (z.current.gyTarget -= t / u),
                L(),
                P(500));
            },
            settle: () => {
              ((z.current.gxTarget = Math.round(z.current.gxTarget)),
                (z.current.gyTarget = Math.round(z.current.gyTarget)),
                L());
            },
            stepBy: (e, t) => {
              z.current.interactive &&
                ((z.current.gxTarget = Math.round(z.current.gxTarget) + e),
                (z.current.gyTarget = Math.round(z.current.gyTarget) + t),
                L());
            },
            setGesturesActive: (e) => {
              (i.default.killTweensOf(z.current, "zoom,zoomTarget"),
                (z.current.zoomTarget = e ? x : w),
                e ||
                  ((z.current.gxTarget = Math.round(z.current.gxTarget)),
                  (z.current.gyTarget = Math.round(z.current.gyTarget))),
                L());
            },
            fade: (e, t) => (
              L(),
              i.default.to(z.current, {
                fade: e,
                duration: 0.55,
                ease: "power2.inOut",
                delay: t?.delay ?? 0,
              })
            ),
            setInteractive: (e) => {
              z.current.interactive = e;
            },
            buildIn: (e, t) => O(e, "in", t ?? !0),
            flyOut: (e) => O(e, "out"),
          })),
          (0, r.useEffect)(() => {
            ((T.current = n),
              n &&
                (i.default.killTweensOf(z.current, "buildT,zoom,zoomTarget"),
                (z.current.buildT = 1e4),
                (z.current.zoom = z.current.zoomTarget = w)));
          }, [n, P, L]),
          (0, r.useEffect)(() => {
            let e = f.current;
            if (!e || n) return;
            let t = !1,
              r = 0,
              u = 0,
              l = (n) => {
                z.current.interactive &&
                  ("mouse" !== n.pointerType || 0 === n.button) &&
                  ((t = !0),
                  (r = n.clientX),
                  (u = n.clientY),
                  e.classList.add("is-dragging"),
                  L(),
                  window.clearTimeout(M.current));
              },
              o = (e) => {
                if (!t) return;
                let n = window.innerWidth,
                  i = window.innerHeight,
                  { pitchXpx: l, pitchYpx: o } = v(
                    n / Math.max(1, i),
                    z.current.zoom,
                    n,
                    i,
                  );
                ((z.current.gxTarget -= ((e.clientX - r) * a.DRAG_GAIN) / l),
                  (z.current.gyTarget -= ((e.clientY - u) * a.DRAG_GAIN) / o),
                  (r = e.clientX),
                  (u = e.clientY));
              },
              c = () => {
                t && ((t = !1), e.classList.remove("is-dragging"), P(250));
              },
              s = (e) => {
                if (!z.current.interactive) return;
                e.preventDefault();
                let t = window.innerWidth,
                  r = window.innerHeight,
                  { pitchXpx: n, pitchYpx: u } = v(
                    t / Math.max(1, r),
                    z.current.zoom,
                    t,
                    r,
                  );
                ((z.current.gxTarget +=
                  (i.default.utils.clamp(-80, 80, e.deltaX) / n) * 1.4),
                  (z.current.gyTarget +=
                    (i.default.utils.clamp(-80, 80, e.deltaY) / u) * 1.4),
                  L(),
                  P(350));
              };
            return (
              e.addEventListener("pointerdown", l),
              window.addEventListener("pointermove", o),
              window.addEventListener("pointerup", c),
              window.addEventListener("pointercancel", c),
              e.addEventListener("wheel", s, { passive: !1 }),
              () => {
                (window.clearTimeout(M.current),
                  e.removeEventListener("pointerdown", l),
                  window.removeEventListener("pointermove", o),
                  window.removeEventListener("pointerup", c),
                  window.removeEventListener("pointercancel", c),
                  e.removeEventListener("wheel", s));
              }
            );
          }, [n, P, L]),
          (0, t.jsx)(o.default, {
            className: "grid-view",
            hidden: n,
            awake: j,
            onContentReady: N,
            onAdvance: k,
            rootRef: f,
            overlay: (0, t.jsx)(t.Fragment, {
              children: [
                ["top", "x"],
                ["bottom", "x"],
                ["left", "y"],
                ["right", "y"],
              ].map(([e, r]) =>
                (0, t.jsx)(
                  "div",
                  {
                    className: `gticker gticker-${e}`,
                    "aria-hidden": "true",
                    children: (0, t.jsx)("div", {
                      className: "gticker-strip",
                      ref: (t) => {
                        if (!t) {
                          R.current[e] = null;
                          return;
                        }
                        let r = Array.from(t.querySelectorAll(".gtick-group"));
                        R.current[e] = {
                          el: t,
                          groups: r,
                          marks: r.map((e) =>
                            Array.from(e.querySelectorAll("i")),
                          ),
                        };
                      },
                      children: ("x" === r ? m : h).map((e) =>
                        (0, t.jsx)(
                          "div",
                          {
                            className: "gtick-group",
                            children: (0, t.jsx)("div", {
                              className: "x" === r ? "tick-row" : "vtick-col",
                              children: Array.from(
                                { length: a.TICKS_PER_GROUP },
                                (e, r) => (0, t.jsx)("i", {}, r),
                              ),
                            }),
                          },
                          e,
                        ),
                      ),
                    }),
                  },
                  e,
                ),
              ),
            }),
            children: (0, t.jsx)(b, {
              sim: z,
              hiddenRef: T,
              ringRef: E,
              onTick: I,
            }),
          })
        );
      },
    ]);
  },
  31628,
  (e) => {
    e.n(e.i(51735));
  },
]);
