// Camera rig: the camera orbits a target at (yaw, pitch, dist). dist ≈ 0 is first-person (walking the alley);
// larger is orbiting (the lion, the table, the lantern). Yaw is unbounded, so the viewer can turn a full circle.
// The viewer steers the goal values; the camera eases toward them. fly() tweens every value for directed shots.
import * as THREE from 'three';
import { animate, ease, lerp } from './tween.js';

export function createRig(camera) {
  const cur = { target: new THREE.Vector3(), yaw: 0, pitch: 0, dist: 3, fov: camera.fov };
  const goal = { target: new THREE.Vector3(), yaw: 0, pitch: 0, dist: 3 };
  let limits = { pitch: [-1.2, 1.2], dist: [0.01, 20], yaw: null }, flying = false;
  const dir = new THREE.Vector3();

  const clampGoal = () => {
    goal.pitch = THREE.MathUtils.clamp(goal.pitch, ...limits.pitch);
    goal.dist = THREE.MathUtils.clamp(goal.dist, ...limits.dist);
    if (limits.yaw) goal.yaw = THREE.MathUtils.clamp(goal.yaw, limits.yaw[0] - limits.yaw[1], limits.yaw[0] + limits.yaw[1]);
  };
  function apply() {
    const cp = Math.cos(cur.pitch);
    dir.set(-Math.sin(cur.yaw) * cp, Math.sin(cur.pitch), -Math.cos(cur.yaw) * cp); // yaw 0 looks toward -z
    camera.position.copy(cur.target).addScaledVector(dir, -cur.dist);
    camera.lookAt(dir.add(camera.position));
  }

  return {
    cur, goal,
    get flying() { return flying; },
    // Snap everything (no easing): used for the first frame.
    set(pose) { for (const k of ['yaw', 'pitch', 'dist']) if (pose[k] != null) cur[k] = goal[k] = pose[k]; if (pose.target) { cur.target.copy(pose.target); goal.target.copy(pose.target); } apply(); },
    setLimits(l) { limits = { pitch: [-1.2, 1.2], dist: [0.01, 20], yaw: null, ...l }; clampGoal(); },
    // Directed move: tween current and goal together; the viewer's input is ignored until it lands.
    fly(pose, dur = 1.5) {
      flying = true;
      const t0 = cur.target.clone(), y0 = cur.yaw, p0 = cur.pitch, d0 = cur.dist, f0 = camera.fov;
      const t1 = pose.target ? pose.target.clone() : t0, p1 = pose.pitch ?? p0, d1 = pose.dist ?? d0, f1 = pose.fov ?? f0;
      let y1 = pose.yaw ?? y0;
      y1 = y0 + THREE.MathUtils.euclideanModulo(y1 - y0 + Math.PI, Math.PI * 2) - Math.PI; // shortest way round
      return animate(dur, (k) => {
        const e = ease(k);
        cur.target.lerpVectors(t0, t1, e); cur.yaw = lerp(y0, y1, e); cur.pitch = lerp(p0, p1, e); cur.dist = lerp(d0, d1, e);
        if (f1 !== f0) { camera.fov = lerp(f0, f1, e); camera.updateProjectionMatrix(); }
        goal.target.copy(cur.target); goal.yaw = cur.yaw; goal.pitch = cur.pitch; goal.dist = cur.dist;
        apply();
      }).then(() => { flying = false; });
    },
    rotate(dYaw, dPitch) { if (flying) return; goal.yaw += dYaw; goal.pitch += dPitch; clampGoal(); },
    zoom(f) { if (flying) return; goal.dist *= f; clampGoal(); },
    update(dt) {
      if (flying) return;
      const k = 1 - Math.exp(-dt * 8);
      cur.yaw += (goal.yaw - cur.yaw) * k; cur.pitch += (goal.pitch - cur.pitch) * k; cur.dist += (goal.dist - cur.dist) * k;
      cur.target.lerp(goal.target, k);
      apply();
    },
  };
}
