// Cover-fit + parallax + saturation on a MeshBasicMaterial via onBeforeCompile (module 12594).
import * as THREE from "three";
import { PARALLAX_MAX, PARALLAX_UV_SCALE } from "@/lib/constants";

export interface TileCover {
  setSaturation: (s: number) => void;
  setParallax: (nx: number, ny: number) => void;
  set: (aspect: number) => void;
}

export function applyTileCover(mat: THREE.MeshBasicMaterial): TileCover {
  const uCoverUv = { value: new THREE.Vector4(1, 1, 0, 0) };
  const uParallax = { value: new THREE.Vector3(0, 0, PARALLAX_UV_SCALE) };
  const uSat = { value: 1 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCoverUv = uCoverUv;
    shader.uniforms.uParallax = uParallax;
    shader.uniforms.uSat = uSat;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        "#include <map_pars_fragment>\nuniform vec4 uCoverUv;\nuniform vec3 uParallax;\nuniform float uSat;",
      )
      .replace(
        "#include <map_fragment>",
        "#ifdef USE_MAP\n  vec2 tileUv = ( vMapUv - 0.5 ) * uParallax.z + 0.5 + uParallax.xy;\n  diffuseColor *= texture2D( map, tileUv * uCoverUv.xy + uCoverUv.zw );\n  float tileLuma = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );\n  diffuseColor.rgb = mix( vec3( tileLuma ), diffuseColor.rgb, uSat );\n#endif",
      );
  };
  mat.customProgramCacheKey = () => "tile-cover";
  mat.userData.tileCover = { uCoverUv, uParallax, uSat };
  return {
    setSaturation: (s) => {
      uSat.value = s;
    },
    setParallax: (nx, ny) => {
      const scale = uParallax.value.z;
      const room = (cover: number) => Math.max(0, Math.min(PARALLAX_MAX, 0.5 / cover - scale / 2));
      const c = (v: number) => Math.max(-1, Math.min(1, v));
      uParallax.value.x = c(nx) * room(uCoverUv.value.x);
      uParallax.value.y = c(ny) * room(uCoverUv.value.y);
    },
    set: (aspect) => {
      const img = mat.map?.image as { videoWidth?: number; width?: number; videoHeight?: number; height?: number } | undefined;
      const w = img?.videoWidth || img?.width;
      const h = img?.videoHeight || img?.height;
      if (w && h && aspect > 0) {
        const ia = w / h;
        const sx = ia > aspect ? aspect / ia : 1;
        const sy = ia > aspect ? 1 : ia / aspect;
        uCoverUv.value.set(sx, sy, (1 - sx) / 2, (1 - sy) / 2);
      } else uCoverUv.value.set(1, 1, 0, 0);
    },
  };
}
