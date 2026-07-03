// Helper to generate a synthetic medical-style image as a data URL via canvas.
// These produce grayscale textures that visually resemble X-rays, MRIs, and dermoscopy.
export function generateMedicalImage(type: 'xray' | 'mri' | 'derm', variant: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  if (type === 'xray') {
    // Chest X-ray: dark background, bilateral lung fields, ribcage texture
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, w, h);

    // Create lung-shaped fields
    const drawLung = (cx: number, cy: number, rw: number, rh: number, opacity: number) => {
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(rw, rh));
      grad.addColorStop(0, `rgba(180,190,200,${opacity})`);
      grad.addColorStop(0.6, `rgba(120,135,150,${opacity * 0.7})`);
      grad.addColorStop(1, 'rgba(20,25,35,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    drawLung(w * 0.35, h * 0.45, 90, 160, 0.85);
    drawLung(w * 0.65, h * 0.45, 90, 160, 0.85);

    // Spine
    const spineGrad = ctx.createLinearGradient(w * 0.48, 0, w * 0.52, 0);
    spineGrad.addColorStop(0, 'rgba(200,210,220,0.3)');
    spineGrad.addColorStop(0.5, 'rgba(220,225,235,0.6)');
    spineGrad.addColorStop(1, 'rgba(200,210,220,0.3)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(w * 0.47, h * 0.1, w * 0.06, h * 0.8);

    // Ribs texture
    ctx.strokeStyle = 'rgba(160,170,185,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const y = h * 0.2 + i * 32;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, y);
      ctx.quadraticCurveTo(w * 0.5, y - 12, w * 0.85, y);
      ctx.stroke();
    }

    // Add pathology for variant > 0
    if (variant === 1) {
      // Pneumonia opacity - lower right lobe
      const grad = ctx.createRadialGradient(w * 0.62, h * 0.6, 5, w * 0.62, h * 0.6, 70);
      grad.addColorStop(0, 'rgba(220,220,225,0.7)');
      grad.addColorStop(0.5, 'rgba(180,185,195,0.5)');
      grad.addColorStop(1, 'rgba(120,130,140,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(w * 0.62, h * 0.6, 65, 55, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (variant === 2) {
      // Bilateral patchy opacity
      const g1 = ctx.createRadialGradient(w * 0.38, h * 0.55, 5, w * 0.38, h * 0.55, 50);
      g1.addColorStop(0, 'rgba(200,205,210,0.5)');
      g1.addColorStop(1, 'rgba(120,130,140,0)');
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.ellipse(w * 0.38, h * 0.55, 45, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      const g2 = ctx.createRadialGradient(w * 0.66, h * 0.5, 5, w * 0.66, h * 0.5, 55);
      g2.addColorStop(0, 'rgba(210,215,220,0.55)');
      g2.addColorStop(1, 'rgba(120,130,140,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.ellipse(w * 0.66, h * 0.5, 50, 45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Noise
    addNoise(ctx, w, h, 15);
  } else if (type === 'mri') {
    // Brain MRI: axial slice with brain tissue, ventricles, skull
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, w, h);

    // Skull outline
    ctx.strokeStyle = 'rgba(200,200,210,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Brain tissue
    const brainGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 200);
    brainGrad.addColorStop(0, 'rgba(180,175,170,0.9)');
    brainGrad.addColorStop(0.5, 'rgba(140,135,130,0.8)');
    brainGrad.addColorStop(0.9, 'rgba(90,85,80,0.6)');
    brainGrad.addColorStop(1, 'rgba(30,28,25,0)');
    ctx.fillStyle = brainGrad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.4, h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ventricles (dark)
    ctx.fillStyle = 'rgba(20,18,15,0.7)';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.48, 18, 30, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.58, h * 0.48, 18, 30, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.42, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sulci/gyri texture
    ctx.strokeStyle = 'rgba(100,95,90,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const r1 = 60 + Math.random() * 40;
      const r2 = r1 + 15 + Math.random() * 20;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(angle) * r1, h / 2 + Math.sin(angle) * r1);
      ctx.lineTo(w / 2 + Math.cos(angle) * r2, h / 2 + Math.sin(angle) * r2);
      ctx.stroke();
    }

    // Tumor for variant > 0
    if (variant === 1) {
      // Glioma - irregular mass right hemisphere
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.4, 5, w * 0.65, h * 0.4, 45);
      grad.addColorStop(0, 'rgba(230,220,200,0.85)');
      grad.addColorStop(0.6, 'rgba(200,180,160,0.6)');
      grad.addColorStop(1, 'rgba(120,100,80,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(w * 0.65, h * 0.4, 40, 35, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Edema ring
      ctx.strokeStyle = 'rgba(180,160,140,0.3)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(w * 0.65, h * 0.4, 52, 45, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (variant === 2) {
      // Meningioma - well-defined round mass
      const grad = ctx.createRadialGradient(w * 0.35, h * 0.55, 5, w * 0.35, h * 0.55, 35);
      grad.addColorStop(0, 'rgba(220,210,190,0.8)');
      grad.addColorStop(0.7, 'rgba(190,175,150,0.5)');
      grad.addColorStop(1, 'rgba(120,110,90,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(w * 0.35, h * 0.55, 32, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    addNoise(ctx, w, h, 10);
  } else if (type === 'derm') {
    // Dermatoscopic: skin background with lesion
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, w, h);

    // Skin texture
    const skinGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 300);
    skinGrad.addColorStop(0, 'rgba(180,150,130,0.9)');
    skinGrad.addColorStop(0.7, 'rgba(150,120,100,0.8)');
    skinGrad.addColorStop(1, 'rgba(80,60,50,0.6)');
    ctx.fillStyle = skinGrad;
    ctx.fillRect(0, 0, w, h);

    if (variant === 0) {
      // Benign nevus - symmetric, uniform color, sharp border
      const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 80);
      grad.addColorStop(0, 'rgba(60,40,30,0.9)');
      grad.addColorStop(0.7, 'rgba(80,55,40,0.7)');
      grad.addColorStop(1, 'rgba(120,90,70,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, 75, 72, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (variant === 1) {
      // Melanoma - asymmetric, irregular border, color variation
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 100);
      grad.addColorStop(0, 'rgba(30,15,10,0.95)');
      grad.addColorStop(0.3, 'rgba(50,25,15,0.85)');
      grad.addColorStop(0.6, 'rgba(80,40,20,0.7)');
      grad.addColorStop(0.8, 'rgba(120,60,30,0.5)');
      grad.addColorStop(1, 'rgba(150,100,70,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      // Irregular shape
      const points = 16;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const r = 70 + Math.sin(angle * 3) * 20 + Math.cos(angle * 5) * 15;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Color variation spots
      ctx.fillStyle = 'rgba(200,180,100,0.3)';
      ctx.beginPath();
      ctx.ellipse(20, -15, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(40,20,10,0.4)';
      ctx.beginPath();
      ctx.ellipse(-25, 20, 18, 15, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (variant === 2) {
      // Basal cell carcinoma - pearly papule with telangiectasia
      const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 90);
      grad.addColorStop(0, 'rgba(200,180,170,0.8)');
      grad.addColorStop(0.5, 'rgba(180,150,140,0.7)');
      grad.addColorStop(0.8, 'rgba(140,110,100,0.5)');
      grad.addColorStop(1, 'rgba(100,80,70,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, 85, 78, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Telangiectatic vessels
      ctx.strokeStyle = 'rgba(180,40,30,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const sx = w / 2 + (Math.random() - 0.5) * 120;
        const sy = h / 2 + (Math.random() - 0.5) * 100;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 40, sy + (Math.random() - 0.5) * 40);
        ctx.stroke();
      }
    }

    addNoise(ctx, w, h, 8);
  }

  return canvas.toDataURL('image/png');
}

function addNoise(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

// Generate a Grad-CAM-style heatmap overlay as a data URL
export function generateHeatmap(
  type: 'xray' | 'mri' | 'derm',
  variant: number,
  size = 512
): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const hotspots: { x: number; y: number; r: number; intensity: number }[] = [];

  if (type === 'xray') {
    if (variant === 0) {
      // Normal - diffuse low activation
      hotspots.push({ x: 0.5, y: 0.45, r: 120, intensity: 0.3 });
    } else if (variant === 1) {
      hotspots.push({ x: 0.62, y: 0.6, r: 70, intensity: 0.95 });
      hotspots.push({ x: 0.58, y: 0.55, r: 40, intensity: 0.6 });
    } else if (variant === 2) {
      hotspots.push({ x: 0.38, y: 0.55, r: 50, intensity: 0.85 });
      hotspots.push({ x: 0.66, y: 0.5, r: 55, intensity: 0.9 });
    }
  } else if (type === 'mri') {
    if (variant === 0) {
      hotspots.push({ x: 0.5, y: 0.5, r: 100, intensity: 0.25 });
    } else if (variant === 1) {
      hotspots.push({ x: 0.65, y: 0.4, r: 50, intensity: 0.95 });
      hotspots.push({ x: 0.68, y: 0.38, r: 30, intensity: 0.7 });
    } else if (variant === 2) {
      hotspots.push({ x: 0.35, y: 0.55, r: 40, intensity: 0.9 });
    }
  } else if (type === 'derm') {
    if (variant === 0) {
      hotspots.push({ x: 0.5, y: 0.5, r: 80, intensity: 0.35 });
    } else if (variant === 1) {
      hotspots.push({ x: 0.52, y: 0.48, r: 90, intensity: 0.95 });
      hotspots.push({ x: 0.58, y: 0.45, r: 30, intensity: 0.7 });
      hotspots.push({ x: 0.43, y: 0.55, r: 35, intensity: 0.65 });
    } else if (variant === 2) {
      hotspots.push({ x: 0.5, y: 0.5, r: 85, intensity: 0.85 });
      hotspots.push({ x: 0.55, y: 0.48, r: 25, intensity: 0.6 });
    }
  }

  // Draw heatmap using jet colormap approximation
  for (const spot of hotspots) {
    const cx = spot.x * size;
    const cy = spot.y * size;
    const r = spot.r;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const alpha = spot.intensity;

    // Jet colormap: blue -> cyan -> green -> yellow -> red
    grad.addColorStop(0, `rgba(255,0,0,${alpha})`); // center = red (hot)
    grad.addColorStop(0.25, `rgba(255,165,0,${alpha * 0.8})`);
    grad.addColorStop(0.5, `rgba(255,255,0,${alpha * 0.5})`);
    grad.addColorStop(0.75, `rgba(0,200,200,${alpha * 0.3})`);
    grad.addColorStop(1, 'rgba(0,0,200,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}
