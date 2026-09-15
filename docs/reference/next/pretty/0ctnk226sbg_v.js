(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
  "object" == typeof document ? document.currentScript : void 0,
  55261,
  (e) => {
    "use strict";
    var t = e.i(43476),
      a = e.i(71645),
      i = e.i(89970),
      r = e.i(76569),
      l = e.i(67037);
    let n = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    e.s([
      "default",
      0,
      function ({ capture: e, onClose: o, onActiveChange: s, ref: d }) {
        let [h, c] = (0, a.useState)(null),
          [u, g] = (0, a.useState)(null),
          p = (0, a.useRef)(!1),
          f = (0, a.useRef)(0),
          m = (0, a.useRef)(null),
          w = (0, a.useRef)(null),
          b = (0, a.useRef)(null),
          v = (0, a.useRef)(null),
          x = (0, a.useRef)(null),
          y = (0, a.useRef)(e);
        ((0, a.useEffect)(() => {
          y.current = e;
        }, [e]),
          (0, a.useEffect)(() => () => window.clearInterval(f.current), []));
        let S = (0, a.useCallback)(() => {
          (window.clearInterval(f.current),
            (p.current = !1),
            s?.(!1),
            w.current && i.default.set(w.current, { opacity: 0 }),
            c(null),
            g(null));
        }, [s]);
        return ((0, a.useLayoutEffect)(() => {
          if (!u) return;
          let e = m.current,
            t = b.current,
            a = x.current,
            l = w.current,
            n = e?.querySelector(".booth-download");
          if (!e || !t || !a || !n) return;
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            (e.classList.remove("is-print-entering"),
              l && i.default.set(l, { opacity: 0 }));
            return;
          }
          (i.default.set(t, { y: window.innerHeight }),
            i.default.set(a, { filter: "brightness(0) saturate(0)" }),
            i.default.set(n, { opacity: 0 }),
            e.classList.remove("is-print-entering"));
          let o = i.default.timeline();
          return (
            l && o.to(l, { opacity: 0, duration: 0.9, ease: "power2.out" }, 0),
            o.add(() => (0, r.playPrintMotor)(2.2), 0.4),
            o.to(t, { y: 0, duration: 2.3, ease: "power3.out" }, 0.4),
            o.to(
              a,
              {
                filter: "brightness(1) saturate(1)",
                duration: 2.8,
                ease: "power1.inOut",
              },
              2.9,
            ),
            o.to(n, { opacity: 1, duration: 0.7, ease: "power2.out" }, 3.2),
            () => {
              o.kill();
            }
          );
        }, [u]),
        (0, a.useEffect)(() => {
          if (!u) return;
          let e = v.current,
            t = m.current;
          if (
            !e ||
            !t ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
          )
            return;
          let a = i.default.quickTo(e, "rotationX", {
              duration: 0.7,
              ease: "power3.out",
            }),
            r = i.default.quickTo(e, "rotationY", {
              duration: 0.7,
              ease: "power3.out",
            }),
            l = 0,
            n = 0,
            o = 0,
            s = !1,
            d = 0,
            h = (e) => {
              s && ((l += (e.clientX - d) * 0.4), (d = e.clientX));
              let t = (e.clientX / window.innerWidth) * 2 - 1,
                i = (e.clientY / window.innerHeight) * 2 - 1;
              ((o = 11 * t), (n = -(11 * i)), r(l + o), a(n));
            },
            c = (t) => {
              ((s = !0), (d = t.clientX), e.classList.add("is-grabbing"));
            },
            g = () => {
              ((s = !1), e.classList.remove("is-grabbing"));
            };
          return (
            t.addEventListener("pointermove", h),
            e.addEventListener("pointerdown", c),
            window.addEventListener("pointerup", g),
            window.addEventListener("pointercancel", g),
            () => {
              (t.removeEventListener("pointermove", h),
                e.removeEventListener("pointerdown", c),
                window.removeEventListener("pointerup", g),
                window.removeEventListener("pointercancel", g));
            }
          );
        }, [u]),
        (0, a.useImperativeHandle)(
          d,
          () => ({
            start: () => {
              if (p.current) return;
              ((p.current = !0), s?.(!0), (0, r.playTick)(), c(3));
              let e = 3;
              f.current = window.setInterval(() => {
                let t, a, l, o, s;
                if (--e > 0) {
                  ((0, r.playTick)(), c(e));
                  return;
                }
                window.clearInterval(f.current);
                let d = y.current();
                if (!d) return void S();
                let h = new Date(),
                  u = (function (e, t) {
                    let a = document.createElement("canvas");
                    ((a.width = e.width), (a.height = e.height));
                    let i = a.getContext("2d");
                    ((i.filter =
                      "contrast(1.18) saturate(1.3) brightness(1.08) sepia(0.12)"),
                      i.drawImage(e, 0, 0),
                      (i.filter = "blur(6px) brightness(1.35)"),
                      (i.globalCompositeOperation = "lighten"),
                      (i.globalAlpha = 0.28),
                      i.drawImage(e, 0, 0),
                      (i.filter = "none"),
                      (i.globalAlpha = 1),
                      (i.globalCompositeOperation = "screen"),
                      (i.fillStyle = "rgba(18, 34, 26, 0.5)"),
                      i.fillRect(0, 0, a.width, a.height),
                      (i.globalCompositeOperation = "overlay"),
                      (i.fillStyle = "rgba(255, 168, 54, 0.12)"),
                      i.fillRect(0, 0, a.width, a.height));
                    let r = document.createElement("canvas");
                    r.width = r.height = 128;
                    let l = r.getContext("2d"),
                      n = l.createImageData(128, 128);
                    for (let e = 0; e < n.data.length; e += 4) {
                      let t = 80 + 96 * Math.random();
                      ((n.data[e] = n.data[e + 1] = n.data[e + 2] = t),
                        (n.data[e + 3] = 52));
                    }
                    (l.putImageData(n, 0, 0),
                      (i.fillStyle = i.createPattern(r, "repeat")),
                      i.fillRect(0, 0, a.width, a.height),
                      (i.globalCompositeOperation = "multiply"));
                    let o = i.createRadialGradient(
                      a.width / 2,
                      a.height / 2,
                      0.38 * Math.min(a.width, a.height),
                      a.width / 2,
                      a.height / 2,
                      0.58 * Math.hypot(a.width, a.height),
                    );
                    (o.addColorStop(0, "rgba(255,255,255,1)"),
                      o.addColorStop(0.72, "rgba(216,208,200,1)"),
                      o.addColorStop(1, "rgba(148,142,138,1)"),
                      (i.fillStyle = o),
                      i.fillRect(0, 0, a.width, a.height),
                      (i.globalCompositeOperation = "source-over"));
                    let s = `'${String(t.getFullYear()).slice(2)} ${t.getMonth() + 1} ${String(t.getDate()).padStart(2, "0")}`,
                      d = Math.round(0.048 * a.width);
                    return (
                      (i.font = `700 ${d}px "Roboto Mono", monospace`),
                      (i.textAlign = "right"),
                      (i.textBaseline = "alphabetic"),
                      (i.shadowColor = "rgba(255, 120, 20, 0.9)"),
                      (i.shadowBlur = 0.45 * d),
                      (i.fillStyle = "#ffb03a"),
                      i.fillText(s, a.width - 1.4 * d, a.height - 1.2 * d),
                      (i.shadowBlur = 0),
                      a
                    );
                  })(
                    ((t = 0.7504132231404959),
                    (l = (a = Math.min(d.width, d.height * t)) / t),
                    ((o = document.createElement("canvas")).width =
                      Math.round(a)),
                    (o.height = Math.round(l)),
                    o
                      .getContext("2d")
                      .drawImage(
                        d,
                        (d.width - a) / 2,
                        (d.height - l) / 2,
                        a,
                        l,
                        0,
                        0,
                        o.width,
                        o.height,
                      ),
                    o),
                    h,
                  );
                ((0, r.playShutter)(),
                  w.current && i.default.set(w.current, { opacity: 1 }),
                  c(null),
                  g({
                    url: u.toDataURL("image/jpeg", 0.92),
                    w: u.width,
                    h: u.height,
                    stamp:
                      ((s = (e) => String(e).padStart(2, "0")),
                      `${s(h.getDate())} ${n[h.getMonth()]} ${h.getFullYear()}, ${s(h.getHours())}:${s(h.getMinutes())}:${s(h.getSeconds())}`),
                    canvas: u,
                  }));
              }, 1e3);
            },
            dismiss: S,
            isActive: () => p.current,
          }),
          [S],
        ),
        null !== h || u)
          ? (0, t.jsxs)(t.Fragment, {
              children: [
                null !== h &&
                  (0, t.jsxs)("div", {
                    className: "booth-countdown",
                    "aria-hidden": "true",
                    children: [
                      (0, t.jsx)("p", {
                        className: "booth-cheese",
                        children: "Say cheese in",
                      }),
                      (0, t.jsx)("p", { className: "booth-num", children: h }),
                    ],
                  }),
                u &&
                  (0, t.jsxs)("div", {
                    className: "booth-preview is-print-entering",
                    ref: m,
                    children: [
                      (0, t.jsx)("button", {
                        type: "button",
                        className: "booth-close",
                        onClick: () => o(),
                        children: "close",
                      }),
                      (0, t.jsx)("div", {
                        className: "booth-frame-wrap",
                        ref: b,
                        children: (0, t.jsxs)("div", {
                          className: "booth-frame",
                          ref: v,
                          children: [
                            (0, t.jsxs)("div", {
                              className: "booth-face",
                              children: [
                                (0, t.jsx)("span", {
                                  className: "booth-label",
                                  children: "Remy shoots",
                                }),
                                (0, t.jsx)("span", {
                                  className: "booth-label booth-label-right",
                                  children: `${u.w}X${u.h}`,
                                }),
                                (0, t.jsx)("img", {
                                  className: "booth-photo",
                                  ref: x,
                                  src: u.url,
                                  alt: "Your photobooth capture",
                                  draggable: !1,
                                }),
                                (0, t.jsxs)("span", {
                                  className: "booth-stamp",
                                  children: [
                                    (0, t.jsx)("i", {
                                      className: "booth-play",
                                      "aria-hidden": "true",
                                    }),
                                    u.stamp,
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)("div", {
                              className: "booth-back",
                              "aria-hidden": "true",
                            }),
                          ],
                        }),
                      }),
                      (0, t.jsx)("button", {
                        type: "button",
                        className: "booth-download",
                        onClick: () => {
                          var e, t;
                          let a,
                            i,
                            r,
                            l = u?.canvas;
                          if (!l) return;
                          let n = document.createElement("canvas");
                          ((n.width = 1036), (n.height = 1402));
                          let o = n.getContext("2d");
                          ((o.fillStyle = "#111111"),
                            o.fillRect(0, 0, n.width, n.height),
                            (t = 1210),
                            (a = Math.max((e = 908) / l.width, t / l.height)),
                            (i = e / a),
                            (r = t / a),
                            o.drawImage(
                              l,
                              (l.width - i) / 2,
                              (l.height - r) / 2,
                              i,
                              r,
                              64,
                              128,
                              e,
                              t,
                            ),
                            (o.fillStyle = "#FCF8EF"),
                            (o.font = '600 32px "Roboto Mono", monospace'),
                            (o.textBaseline = "top"),
                            o.fillText("REMY SHOOTS", 68, 46),
                            (o.textAlign = "right"),
                            o.fillText(`${l.width}X${l.height}`, 968, 46),
                            (o.textAlign = "left"),
                            o.beginPath(),
                            o.moveTo(54, 1352),
                            o.lineTo(54, 1376),
                            o.lineTo(78, 1364),
                            o.closePath(),
                            o.fill(),
                            o.fillText(
                              (u?.stamp ?? "").toUpperCase(),
                              110,
                              1350,
                            ));
                          let s = document.createElement("a");
                          ((s.download = `remy-shoots-${Date.now()}.png`),
                            (s.href = n.toDataURL("image/png")),
                            s.click());
                        },
                        children: (0, t.jsx)(l.default, {
                          children: "download",
                        }),
                      }),
                    ],
                  }),
                (0, t.jsx)("div", {
                  className: "booth-flash",
                  ref: w,
                  "aria-hidden": "true",
                }),
              ],
            })
          : null;
      },
    ]);
  },
  76741,
  (e) => {
    e.n(e.i(55261));
  },
]);
