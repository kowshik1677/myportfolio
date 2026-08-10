document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------- DATA LOADING ---------------- */
async function loadData(){
  try{
    const res = await fetch('data.json');
    if(!res.ok) throw new Error('fetch failed');
    return await res.json();
  }catch(err){
    // Fallback for file:// contexts where fetch of local JSON is blocked by the browser.
    // If you see this fallback firing, open the project with VS Code's Live Server instead
    // (see setup instructions) so data.json loads over http://.
    console.warn('Falling back to inline data — serve via http:// for data.json to load.', err);
    return window.__PORTFOLIO_FALLBACK__ || null;
  }
}

function el(tag, cls, html){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(html !== undefined) e.innerHTML = html;
  return e;
}

function render(data){
  if(!data) return;

  document.getElementById('hero-name').innerHTML = data.name + '<span class="cursor">_</span>';
  document.getElementById('hero-role').textContent = data.role;
  document.getElementById('hero-tagline').textContent = data.tagline;
  document.getElementById('hero-email').href = 'mailto:' + data.contact.email;
  document.getElementById('objective-text').textContent = data.objective;

  // Projects
  const projectList = document.getElementById('project-list');
  data.projects.forEach(p => {
    const card = el('div', 'project-card' + (p.featured ? ' featured' : ''));
    card.innerHTML = `
      <p class="tag">${p.featured ? 'FEATURED CASE' : 'CASE FILE'}</p>
      <h3>${p.name}</h3>
      <p class="subtitle">${p.subtitle}</p>
      <p class="desc">${p.description}</p>
      <ul>${p.points.map(pt => `<li>${pt}</li>`).join('')}</ul>
    `;
    projectList.appendChild(card);
  });

  // Skills
  const skillGrid = document.getElementById('skill-grid');
  Object.entries(data.skills).forEach(([category, items]) => {
    const card = el('div', 'skill-card');
    card.innerHTML = `
      <h4>${category}</h4>
      <div class="pill-row">${items.map(i => `<span class="pill">${i}</span>`).join('')}</div>
    `;
    skillGrid.appendChild(card);
  });

  // Education
  const eduList = document.getElementById('education-list');
  data.education.forEach(ed => {
    const item = el('div', 'timeline-item');
    item.innerHTML = `
      <p class="years">${ed.years}</p>
      <h4>${ed.school}</h4>
      <p>${ed.degree} · ${ed.score}</p>
    `;
    eduList.appendChild(item);
  });

  // Certifications
  const certList = document.getElementById('cert-list');
  data.certifications.forEach(c => {
    const item = el('div', 'cert-item');
    item.innerHTML = `<h4>${c.title}</h4><p>${c.issuer}</p>`;
    certList.appendChild(item);
  });

  // Contact
  document.getElementById('contact-email').innerHTML = `EMAIL &nbsp; <a href="mailto:${data.contact.email}">${data.contact.email}</a>`;
  document.getElementById('contact-phone').innerHTML = `PHONE &nbsp; <a href="tel:${data.contact.phone}">${data.contact.phone}</a>`;
  document.getElementById('contact-location').innerHTML = `BASE &nbsp;&nbsp; ${data.contact.location}`;
  document.getElementById('contact-github').innerHTML = `GITHUB &nbsp; <a href="https://github.com/${data.contact.github}" target="_blank" rel="noopener">github.com/${data.contact.github}</a>`;

  initTilt();
}

loadData().then(render);

/* ---------------- 3D TILT ON CARDS ---------------- */
function initTilt(){
  const cards = document.querySelectorAll('.project-card, .skill-card');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion) return;

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateY(0) rotateX(0) translateZ(0)';
    });
  });
}

/* ---------------- 3D RETINA-SCAN ORB (three.js) ---------------- */
(function initOrb(){
  const mount = document.getElementById('orb-canvas');
  if(!mount || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.z = 3.4;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.appendChild(renderer.domElement);

  const uniforms = {
    uTime: { value: 0 },
    uScanColor: { value: new THREE.Color(0x29e0c9) },
    uVesselColor: { value: new THREE.Color(0xff5470) },
    uBaseColor: { value: new THREE.Color(0x220a14) },
    uBaseColor2: { value: new THREE.Color(0x3d0f1a) }
  };

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main(){
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uScanColor;
    uniform vec3 uVesselColor;
    uniform vec3 uBaseColor;
    uniform vec3 uBaseColor2;
    varying vec2 vUv;
    varying vec3 vNormal;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

    float vein(vec2 uv, float seed){
      float v = 0.0;
      vec2 p = uv * 6.0 + seed;
      v += abs(sin(p.x * 3.0 + sin(p.y * 5.0 + seed) * 2.0));
      v += abs(sin(p.y * 4.0 + cos(p.x * 4.0 + seed) * 2.0)) * 0.6;
      return smoothstep(0.94, 1.0, v);
    }

    void main(){
      vec3 base = mix(uBaseColor, uBaseColor2, vUv.y);

      float v1 = vein(vUv, 0.0);
      float v2 = vein(vUv, 12.4) * 0.7;
      float vessels = clamp(v1 + v2, 0.0, 1.0);
      vec3 color = mix(base, uVesselColor, vessels * 0.55);

      // rotating scan band
      float band = fract(vUv.y * 1.4 - uTime * 0.12);
      float scan = smoothstep(0.06, 0.0, abs(band - 0.5) - 0.02);
      color += uScanColor * scan * 0.9;

      // fresnel rim glow
      float fresnel = pow(1.0 - abs(vNormal.z), 2.2);
      color += uScanColor * fresnel * 0.35;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const geometry = new THREE.SphereGeometry(1.15, 96, 96);
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // faint wireframe shell for a diagnostic-instrument feel
  const wireGeo = new THREE.SphereGeometry(1.32, 24, 16);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x29e0c9, wireframe: true, transparent: true, opacity: 0.08 });
  const wireSphere = new THREE.Mesh(wireGeo, wireMat);
  scene.add(wireSphere);

  let targetX = 0, targetY = 0;
  window.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
    targetY = (e.clientY / window.innerHeight - 0.5) * 0.6;
  });

  const clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    sphere.rotation.y += reduceMotion ? 0 : 0.0025;
    wireSphere.rotation.y -= reduceMotion ? 0 : 0.0012;
    wireSphere.rotation.x += reduceMotion ? 0 : 0.0006;

    sphere.rotation.x += (targetY - sphere.rotation.x) * 0.03;
    sphere.rotation.y += (targetX - sphere.rotation.y) * 0.0; // keep autorotation dominant on y

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = mount.clientWidth, h = mount.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();
