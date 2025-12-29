/**
 * Mythic Solar System Simulation
 * Dreamlike, emotional, cinematic visuals
 */

// ============================================
// PRE-CALCULATED CONSTANTS (Performance)
// ============================================
const PI = Math.PI;
const TWO_PI = PI * 2;
const HALF_PI = PI / 2;
const DEG_TO_RAD = PI / 180;
const RAD_TO_DEG = 180 / PI;

// ============================================
// NOISE FUNCTIONS FOR REALISTIC TEXTURES
// ============================================

class Noise {
    static random(x, y, seed = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
    }

    static smoothNoise(x, y, seed = 0) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;

        const a = this.random(ix, iy, seed);
        const b = this.random(ix + 1, iy, seed);
        const c = this.random(ix, iy + 1, seed);
        const d = this.random(ix + 1, iy + 1, seed);

        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);

        return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
    }

    static fbm(x, y, octaves = 6, seed = 0) {
        let value = 0;
        let amplitude = 0.5;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.smoothNoise(x * frequency, y * frequency, seed + i * 100);
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue;
    }

    static turbulence(x, y, octaves = 6, seed = 0) {
        let value = 0;
        let amplitude = 0.5;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += amplitude * Math.abs(this.smoothNoise(x * frequency, y * frequency, seed + i * 100) * 2 - 1);
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue;
    }

    static ridged(x, y, octaves = 6, seed = 0) {
        let value = 0;
        let amplitude = 0.5;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            let n = 1 - Math.abs(this.smoothNoise(x * frequency, y * frequency, seed + i * 100) * 2 - 1);
            n = n * n;
            value += amplitude * n;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue;
    }
}

// ============================================
// TEXTURE GENERATOR - BRIGHTER, MORE VIVID
// ============================================

class TextureGenerator {
    static createTexture(width, height, generator) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const u = x / width;
                const v = y / height;
                const color = generator(u, v, x, y);
                const idx = (y * width + x) * 4;
                data[idx] = Math.min(255, Math.max(0, color.r));
                data[idx + 1] = Math.min(255, Math.max(0, color.g));
                data[idx + 2] = Math.min(255, Math.max(0, color.b));
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return new THREE.CanvasTexture(canvas);
    }

    // SUN - Fiery, dynamic, with granulation and active regions
    static createSunTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 30;
            const y = v * 15;

            // Solar granulation - convection cells
            const granulation = Noise.fbm(x * 4, y * 4, 4, 1);
            const largeGranules = Noise.fbm(x * 1.5, y * 1.5, 3, 2);

            let intensity = 0.85 + granulation * 0.12 + largeGranules * 0.08;

            // Supergranulation - larger scale patterns
            const superGran = Noise.fbm(x * 0.3, y * 0.3, 3, 10);
            intensity += superGran * 0.05;

            // Sunspots - dark cooler regions with penumbra
            const spotNoise = Noise.fbm(x * 0.4, y * 0.4, 4, 3);
            const spotDetail = Noise.fbm(x * 2, y * 2, 3, 4);
            if (spotNoise > 0.72) {
                const spotIntensity = (spotNoise - 0.72) * 3;
                // Dark umbra center
                intensity *= 1 - spotIntensity * 0.5;
                // Penumbra has filament structure
                if (spotNoise < 0.82) {
                    intensity += spotDetail * 0.1;
                }
            }

            // Faculae - bright regions near sunspots
            const faculae = Noise.ridged(x * 1.2, y * 1.2, 4, 5);
            if (faculae > 0.6 && spotNoise > 0.5 && spotNoise < 0.72) {
                intensity += (faculae - 0.6) * 0.3;
            }

            // Active regions - brighter, more turbulent
            const active = Noise.turbulence(x * 0.8, y * 0.8, 4, 6);
            if (active > 0.6) {
                intensity += (active - 0.6) * 0.15;
            }

            // Limb darkening simulation (edges appear darker)
            const limbDist = Math.abs(v - 0.5) * 2;
            const limbDarkening = 1 - limbDist * 0.15;
            intensity *= limbDarkening;

            // Color temperature variation
            const tempVar = Noise.fbm(x * 2, y * 2, 3, 7) * 0.1;

            return {
                r: Math.min(255, Math.max(0, intensity * 255 + 30)),
                g: Math.min(255, Math.max(0, intensity * 200 + tempVar * 50)),
                b: Math.min(255, Math.max(0, intensity * 80 + tempVar * 20))
            };
        });
    }

    // MERCURY - Heavily cratered, grey with subtle brown tints
    static createMercuryTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 40;
            const y = v * 20;

            // Base highland terrain
            let height = Noise.fbm(x, y, 4, 10) * 0.4 + 0.5;

            // Large impact basins (like Caloris Basin)
            const basins = Noise.fbm(x * 0.2, y * 0.2, 3, 11);
            if (basins < 0.35) {
                height *= 0.75;
                // Smoother basin floors
                height += Noise.fbm(x * 0.5, y * 0.5, 2, 20) * 0.1;
            }

            // Large craters using noise
            const craterNoise = Noise.turbulence(x * 2, y * 2, 3, 12);
            if (craterNoise > 0.7) {
                height -= (craterNoise - 0.7) * 0.4;
            } else if (craterNoise > 0.6) {
                height += (craterNoise - 0.6) * 0.2;
            }

            // Medium craters
            const medCraters = Noise.turbulence(x * 3, y * 3, 4, 13);
            height += (medCraters - 0.5) * 0.15;

            // Fine surface texture
            const fine = Noise.fbm(x * 8, y * 8, 3, 14);
            height += (fine - 0.5) * 0.05;

            // Ray systems from fresh craters (bright streaks)
            const rays = Noise.ridged(x * 0.8, y * 0.8, 3, 15);
            if (rays > 0.75) {
                height += (rays - 0.75) * 0.3;
            }

            // Color: grey with subtle warm brown undertones
            const base = Math.floor(height * 140 + 80);
            return {
                r: Math.min(255, base + 12),
                g: Math.min(255, base + 5),
                b: Math.min(255, base - 5)
            };
        });
    }

    // VENUS - Thick sulfuric acid clouds, yellowish with swirling patterns
    static createVenusTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 20;
            const y = v * 10;

            // Base cloud layer - Y-shaped pattern characteristic of Venus
            const yPattern = Math.sin(y * 2.5 + Math.sin(x * 0.3) * 1.5);
            let clouds = yPattern * 0.15 + 0.55;

            // Super-rotation cloud bands (Venus rotates very slowly but clouds move fast)
            const bands = Math.sin(y * 6 + x * 0.8 + Noise.fbm(x, y, 3, 20) * 2);
            clouds += bands * 0.08;

            // Large-scale vortex patterns
            const vortex1 = Noise.fbm(x * 0.5 + Math.sin(y * 1.5) * 3, y * 0.5, 3, 21);
            clouds += vortex1 * 0.2;

            // Medium turbulence
            const turb = Noise.turbulence(x * 1.5, y * 1.5, 4, 22);
            clouds += turb * 0.12;

            // Fine cloud detail
            const detail = Noise.fbm(x * 4, y * 4, 4, 23);
            clouds += (detail - 0.5) * 0.08;

            // Polar vortex darkening
            const polarDist = Math.abs(v - 0.5) * 2;
            if (polarDist > 0.7) {
                const vortexStrength = (polarDist - 0.7) / 0.3;
                clouds -= vortexStrength * 0.15;
                // Spiral pattern in polar vortex
                const angle = Math.atan2(v - 0.5, (u - 0.5) * 2);
                clouds += Math.sin(angle * 4 + polarDist * 10) * vortexStrength * 0.05;
            }

            // Upper haze layer
            const haze = Noise.fbm(x * 0.3, y * 0.3, 2, 24) * 0.1;
            clouds += haze;

            clouds = Math.max(0.3, Math.min(1, clouds));

            // Colors: pale yellow-white with orange tints in darker regions
            const brightness = clouds;
            return {
                r: Math.floor(230 * brightness + 40),
                g: Math.floor(195 * brightness + 45),
                b: Math.floor(130 * brightness + 50)
            };
        });
    }

    // EARTH - Blue marble with realistic continents and oceans
    static createEarthTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 25;
            const y = v * 12.5;
            const lat = (v - 0.5) * Math.PI;
            const polarDist = Math.abs(lat) / (Math.PI / 2);

            // Continental shapes - multiple scales for realistic coastlines
            let landMask = Noise.fbm(x * 0.6, y * 0.6, 4, 30);
            landMask += Noise.fbm(x * 1.2 + 100, y * 1.2, 3, 31) * 0.35;
            landMask += Noise.ridged(x * 0.8, y * 0.8, 3, 42) * 0.15;
            // Longitude variation for continent distribution
            landMask += Math.sin(u * Math.PI * 2.5 + 0.5) * 0.12;
            const isLand = landMask > 0.52;

            let r, g, b;

            // Ice caps with irregular edges
            const iceEdge = 0.82 - Noise.fbm(x * 2, y * 2, 3, 35) * 0.1;
            if (polarDist > iceEdge) {
                const iceStrength = (polarDist - iceEdge) / (1 - iceEdge);
                const iceDetail = Noise.fbm(x * 6, y * 6, 3, 43);
                r = Math.floor(240 + iceDetail * 15);
                g = Math.floor(248 + iceDetail * 7);
                b = 255;
                // Blend at edges
                if (iceStrength < 0.3) {
                    const blend = iceStrength / 0.3;
                    if (isLand) {
                        r = Math.floor(r * blend + 200 * (1 - blend));
                        g = Math.floor(g * blend + 210 * (1 - blend));
                        b = Math.floor(b * blend + 220 * (1 - blend));
                    }
                }
                return { r, g, b };
            }

            if (isLand) {
                const elevation = Noise.fbm(x * 2, y * 2, 4, 32);
                const moisture = Noise.fbm(x * 1.2 + 50, y * 1.2, 3, 33);
                const detail = Noise.fbm(x * 8, y * 8, 3, 44);

                // Biome determination
                if (elevation > 0.72) {
                    // High mountains with snow
                    const rockNoise = Noise.fbm(x * 5, y * 5, 3, 45);
                    const snowLine = 0.72 + (1 - polarDist) * 0.1;
                    if (elevation > snowLine + 0.08) {
                        // Snow caps
                        r = Math.floor(245 + rockNoise * 10);
                        g = Math.floor(250 + rockNoise * 5);
                        b = 255;
                    } else {
                        // Rocky peaks
                        r = Math.floor(130 + rockNoise * 50 + detail * 20);
                        g = Math.floor(120 + rockNoise * 45 + detail * 18);
                        b = Math.floor(110 + rockNoise * 40 + detail * 15);
                    }
                } else if (polarDist > 0.6) {
                    // Tundra/Taiga - more brown/grey
                    r = Math.floor(90 + moisture * 25 + detail * 15);
                    g = Math.floor(95 + moisture * 25 + detail * 15);
                    b = Math.floor(80 + moisture * 15 + detail * 10);
                } else if (polarDist < 0.18 && moisture > 0.4) {
                    // Tropical rainforest - darker, less saturated green
                    r = Math.floor(45 + detail * 20);
                    g = Math.floor(75 + moisture * 30 + detail * 20);
                    b = Math.floor(40 + detail * 15);
                } else if (moisture < 0.28 && polarDist > 0.12 && polarDist < 0.5) {
                    // Desert
                    const sandVar = Noise.fbm(x * 4, y * 4, 3, 46);
                    r = Math.floor(210 + sandVar * 30 + detail * 10);
                    g = Math.floor(180 + sandVar * 25 + detail * 8);
                    b = Math.floor(130 + sandVar * 20 + detail * 5);
                } else if (moisture < 0.42) {
                    // Savanna/Grassland - more tan/olive
                    r = Math.floor(145 + detail * 20);
                    g = Math.floor(135 + moisture * 25 + detail * 15);
                    b = Math.floor(85 + detail * 12);
                } else {
                    // Temperate forest - balanced green-brown
                    r = Math.floor(65 + elevation * 30 + detail * 15);
                    g = Math.floor(90 + elevation * 35 + moisture * 20 + detail * 15);
                    b = Math.floor(55 + elevation * 20 + detail * 10);
                }

                // Coastal lowlands - slightly sandy
                const coastDist = landMask - 0.52;
                if (coastDist < 0.05 && coastDist > 0) {
                    const beachBlend = 1 - coastDist / 0.05;
                    r = Math.floor(r * (1 - beachBlend * 0.4) + 200 * beachBlend * 0.4);
                    g = Math.floor(g * (1 - beachBlend * 0.4) + 185 * beachBlend * 0.4);
                    b = Math.floor(b * (1 - beachBlend * 0.4) + 140 * beachBlend * 0.4);
                }
            } else {
                // OCEAN
                const depthNoise = Noise.fbm(x * 0.8, y * 0.8, 4, 37);
                const oceanDetail = Noise.fbm(x * 4, y * 4, 3, 47);
                const depth = (0.52 - landMask) / 0.52;

                // Shallow coastal waters
                if (depth < 0.15) {
                    const shallowBlend = depth / 0.15;
                    r = Math.floor(60 * shallowBlend + 90 * (1 - shallowBlend));
                    g = Math.floor(130 * shallowBlend + 185 * (1 - shallowBlend));
                    b = Math.floor(180 * shallowBlend + 210 * (1 - shallowBlend));
                } else {
                    // Deep ocean with variation
                    const deepVar = depthNoise * 0.15;
                    r = Math.floor(20 + oceanDetail * 15);
                    g = Math.floor(70 + (1 - depth) * 50 + oceanDetail * 20 - deepVar * 30);
                    b = Math.floor(140 + (1 - depth) * 60 + oceanDetail * 15);
                }
            }

            // Subtle cloud wisps (not too heavy)
            const clouds = Noise.fbm(x * 1.5 + 200, y * 1.5, 3, 38);
            if (clouds > 0.55) {
                const cloudIntensity = (clouds - 0.55) * 1.8;
                r = Math.floor(r + (255 - r) * cloudIntensity * 0.35);
                g = Math.floor(g + (255 - g) * cloudIntensity * 0.35);
                b = Math.floor(b + (255 - b) * cloudIntensity * 0.35);
            }

            return { r: Math.min(255, r), g: Math.min(255, g), b: Math.min(255, b) };
        });
    }

    // EARTH NIGHT - City lights
    static createEarthNightTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 20;
            const y = v * 10;
            const lat = (v - 0.5) * Math.PI;

            // Use same land mask as day texture
            let landMask = Noise.fbm(x * 0.8, y * 0.8, 6, 30);
            landMask += Noise.fbm(x * 1.5 + 100, y * 1.5, 4, 31) * 0.3;
            landMask += Math.sin(u * Math.PI * 3) * 0.1;
            const isLand = landMask > 0.55;

            let r = 0, g = 0, b = 0;

            if (isLand && Math.abs(lat) < 1.1) {
                // City light clusters
                const cities = Noise.fbm(x * 3, y * 3, 4, 100);
                const density = Noise.fbm(x * 1.5, y * 1.5, 3, 101);

                if (cities > 0.6 && density > 0.4) {
                    const intensity = (cities - 0.6) * 2.5 * density;
                    // Warm city glow
                    r = Math.floor(255 * intensity * 0.9);
                    g = Math.floor(200 * intensity * 0.7);
                    b = Math.floor(100 * intensity * 0.4);
                }
            }

            return { r, g, b };
        });
    }

    // MARS - Warm, dusty, matte
    static createMarsTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 20;
            const y = v * 10;
            const lat = (v - 0.5) * Math.PI;

            let terrain = Noise.fbm(x, y, 4, 40);
            const darkRegions = Noise.fbm(x * 0.5, y * 0.5, 3, 41);
            const craters = Noise.turbulence(x * 3, y * 3, 3, 42) * 0.3;
            terrain += craters;

            // Canyon system
            const canyon = Math.abs(Math.sin(x * 0.3 + y * 0.1)) * Noise.fbm(x * 0.2, y * 0.2, 3, 43);
            if (canyon < 0.1 && v > 0.3 && v < 0.6) {
                terrain *= 0.7;
            }

            let r, g, b;
            if (darkRegions < 0.4) {
                // Dark volcanic regions - warmer
                r = Math.floor(140 + terrain * 50);
                g = Math.floor(80 + terrain * 35);
                b = Math.floor(50 + terrain * 25);
            } else {
                // Rusty red surface - vibrant orange-red
                r = Math.floor(210 + terrain * 40);
                g = Math.floor(120 + terrain * 35);
                b = Math.floor(70 + terrain * 25);
            }

            // Dust storms - subtle lighter patches
            const dust = Noise.fbm(x * 0.8 + 100, y * 0.8, 3, 44);
            if (dust > 0.7) {
                const intensity = (dust - 0.7) * 2;
                r = Math.floor(r + (240 - r) * intensity * 0.25);
                g = Math.floor(g + (180 - g) * intensity * 0.25);
                b = Math.floor(b + (140 - b) * intensity * 0.25);
            }

            // Polar ice caps
            if (Math.abs(lat) > 1.3) {
                const ice = (Math.abs(lat) - 1.3) / 0.27;
                r = Math.floor(r + (255 - r) * ice);
                g = Math.floor(g + (250 - g) * ice);
                b = Math.floor(b + (248 - b) * ice);
            }

            return { r: Math.min(255, r), g: Math.min(255, g), b: Math.min(255, b) };
        });
    }

    // JUPITER - Massive banded gas giant with Great Red Spot and turbulent storms
    static createJupiterTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 30;
            const y = v * 15;
            const lat = (v - 0.5) * 2; // -1 to 1

            // Complex banding structure with multiple frequencies
            let band = 0;
            // Main bands
            band += Math.sin(v * Math.PI * 12) * 0.3;
            band += Math.sin(v * Math.PI * 24 + 0.5) * 0.15;
            band += Math.sin(v * Math.PI * 6) * 0.1;

            // Band distortion from turbulence
            const distort = Noise.fbm(x * 0.8, y * 0.3, 4, 50);
            band += Math.sin(v * Math.PI * 12 + distort * 2) * 0.1;

            // Large-scale turbulence
            const largeTurb = Noise.fbm(x * 0.5, y * 0.2, 3, 51);
            band += largeTurb * 0.15;

            // Small-scale eddies at band edges
            const eddyStrength = Math.abs(Math.cos(v * Math.PI * 12)) * 0.8;
            const eddies = Noise.turbulence(x * 2 + Math.sin(y * 3) * 3, y * 1.5, 4, 52);
            band += eddies * 0.12 * eddyStrength;

            // Chevron patterns in equatorial region
            if (Math.abs(lat) < 0.3) {
                const chevron = Math.sin(x * 0.5 + Math.abs(lat) * 20) * (1 - Math.abs(lat) / 0.3);
                band += chevron * 0.08;
            }

            // Fine detail
            const detail = Noise.fbm(x * 4, y * 4, 3, 53);
            band += (detail - 0.5) * 0.06;

            band = band * 0.5 + 0.5; // Normalize to 0-1

            // GREAT RED SPOT - anticyclonic storm
            const spotX = 0.62, spotY = 0.57;
            const spotAspect = 1.8; // Elongated
            const spotDist = Math.sqrt(Math.pow((u - spotX) * spotAspect, 2) + Math.pow((v - spotY), 2));
            let spot = 0;
            if (spotDist < 0.08) {
                spot = 1 - spotDist / 0.08;
                // Spiral structure
                const angle = Math.atan2(v - spotY, (u - spotX) * spotAspect);
                const spiral = Math.sin(angle * 2 - spotDist * 60);
                spot *= 0.7 + 0.3 * spiral;
                // Inner eye slightly different
                if (spotDist < 0.03) {
                    spot *= 0.9 + Noise.fbm(x * 8, y * 8, 2, 54) * 0.2;
                }
            }

            // White oval storms using noise
            let storms = 0;
            const stormNoise = Noise.fbm(x * 0.4, y * 0.4, 2, 56);
            if (stormNoise > 0.78) {
                storms = (stormNoise - 0.78) * 3;
            }

            // Color palette - cream, orange, brown, rust bands
            let r, g, b;
            if (band > 0.65) {
                // Light zones - cream/white
                const zoneVar = Noise.fbm(x * 3, y * 3, 2, 55) * 0.1;
                r = Math.floor(250 - (band - 0.65) * 30 + zoneVar * 20);
                g = Math.floor(242 - (band - 0.65) * 40 + zoneVar * 15);
                b = Math.floor(215 - (band - 0.65) * 50 + zoneVar * 10);
            } else if (band > 0.45) {
                // Orange-tan bands
                r = Math.floor(225 + (band - 0.45) * 60);
                g = Math.floor(165 + (band - 0.45) * 80);
                b = Math.floor(115 + (band - 0.45) * 60);
            } else if (band > 0.3) {
                // Rust/brown bands
                r = Math.floor(195 + (band - 0.3) * 80);
                g = Math.floor(130 + (band - 0.3) * 70);
                b = Math.floor(90 + (band - 0.3) * 50);
            } else {
                // Dark brown belts
                r = Math.floor(165 + band * 100);
                g = Math.floor(100 + band * 100);
                b = Math.floor(70 + band * 70);
            }

            // Apply Great Red Spot
            if (spot > 0.05) {
                const spotBlend = Math.min(1, spot * 1.5);
                r = Math.floor(r * (1 - spotBlend) + 210 * spotBlend);
                g = Math.floor(g * (1 - spotBlend * 0.7) + 100 * spotBlend * 0.7);
                b = Math.floor(b * (1 - spotBlend * 0.8) + 80 * spotBlend * 0.8);
            }

            // White storms
            if (storms > 0.1) {
                r = Math.floor(r + (255 - r) * storms);
                g = Math.floor(g + (250 - g) * storms);
                b = Math.floor(b + (245 - b) * storms);
            }

            return { r: Math.min(255, r), g: Math.min(255, g), b: Math.min(255, b) };
        });
    }

    // SATURN - Golden banded gas giant with subtle storms
    static createSaturnTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 25;
            const y = v * 12;
            const lat = Math.abs(v - 0.5) * 2;

            // Banding - more subtle than Jupiter
            let band = 0;
            band += Math.sin(v * Math.PI * 8) * 0.2;
            band += Math.sin(v * Math.PI * 16 + 0.3) * 0.1;
            band += Math.sin(v * Math.PI * 4) * 0.08;

            // Soft turbulence
            const turb = Noise.fbm(x * 0.6, y * 0.25, 3, 60);
            band += turb * 0.12;

            // Band edge softening
            const edgeTurb = Noise.fbm(x * 1.5 + Math.sin(y * 2) * 2, y, 4, 61);
            band += edgeTurb * 0.08;

            // Fine atmospheric detail
            const detail = Noise.fbm(x * 3, y * 3, 3, 62);
            band += (detail - 0.5) * 0.05;

            band = band * 0.5 + 0.5;

            // Polar regions - hexagonal vortex hint at north pole
            if (v < 0.12) {
                const polarDist = v / 0.12;
                const angle = Math.atan2(v - 0.06, u - 0.5);
                // Hexagonal pattern
                const hex = Math.cos(angle * 6) * 0.5 + 0.5;
                band -= (1 - polarDist) * 0.15 * (0.7 + hex * 0.3);
                // Vortex detail
                const vortexDetail = Noise.fbm(x * 4, y * 4, 3, 63);
                band += vortexDetail * 0.1 * (1 - polarDist);
            }
            if (v > 0.88) {
                const polarDist = (v - 0.88) / 0.12;
                band -= polarDist * 0.1;
            }

            // Occasional white storms
            let storm = 0;
            const stormNoise = Noise.fbm(x * 0.3, y * 0.3, 3, 64);
            if (stormNoise > 0.78) {
                storm = (stormNoise - 0.78) * 4;
            }

            // Golden-yellow to pale tan color palette
            let r, g, b;
            if (band > 0.6) {
                // Light zones - pale gold/cream
                r = Math.floor(250 - (band - 0.6) * 20);
                g = Math.floor(235 - (band - 0.6) * 30);
                b = Math.floor(195 - (band - 0.6) * 40);
            } else if (band > 0.4) {
                // Mid bands - golden
                r = Math.floor(240 + (band - 0.4) * 25);
                g = Math.floor(210 + (band - 0.4) * 50);
                b = Math.floor(160 + (band - 0.4) * 70);
            } else {
                // Dark bands - tan/ochre
                r = Math.floor(210 + band * 75);
                g = Math.floor(175 + band * 90);
                b = Math.floor(130 + band * 75);
            }

            // Apply storms
            if (storm > 0.1) {
                r = Math.floor(r + (255 - r) * storm * 0.6);
                g = Math.floor(g + (252 - g) * storm * 0.6);
                b = Math.floor(b + (245 - b) * storm * 0.6);
            }

            return { r: Math.min(255, r), g: Math.min(255, g), b: Math.min(255, b) };
        });
    }

    // URANUS - Pale cyan ice giant with subtle banding
    static createUranusTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 20;
            const y = v * 10;
            const lat = Math.abs(v - 0.5) * 2;

            // Very subtle banding - Uranus appears nearly featureless
            let band = 0;
            band += Math.sin(v * Math.PI * 6) * 0.05;
            band += Noise.fbm(x * 0.4, y * 0.3, 4, 70) * 0.08;

            // Polar brightening (Uranus has bright polar regions)
            const polarBright = Math.pow(lat, 1.5) * 0.2;
            band += polarBright;

            // Subtle haze layers
            const haze = Noise.fbm(x * 0.8, y * 0.4, 4, 71) * 0.06;
            band += haze;

            // Fine methane cloud detail
            const clouds = Noise.fbm(x * 2, y * 2, 3, 72);
            band += (clouds - 0.5) * 0.04;

            band = Math.max(0, Math.min(1, band * 0.5 + 0.5));

            // Occasional faint cloud features
            let cloudFeature = 0;
            const cloudNoise = Noise.fbm(x * 0.5, y * 0.5, 3, 73);
            if (cloudNoise > 0.72) {
                cloudFeature = (cloudNoise - 0.72) * 2.5;
            }

            // Pale cyan-green color (methane absorption makes it blue-green)
            let r = Math.floor(160 + band * 30);
            let g = Math.floor(215 + band * 25);
            let b = Math.floor(235 + band * 15);

            // Brighter cloud features
            if (cloudFeature > 0.1) {
                r = Math.floor(r + (220 - r) * cloudFeature * 0.5);
                g = Math.floor(g + (240 - g) * cloudFeature * 0.5);
                b = Math.floor(b + (250 - b) * cloudFeature * 0.5);
            }

            return { r: Math.min(255, r), g: Math.min(255, g), b: Math.min(255, b) };
        });
    }

    // NEPTUNE - Deep blue ice giant with dramatic storms and clouds
    static createNeptuneTexture() {
        return this.createTexture(1024, 512, (u, v) => {
            const x = u * 22;
            const y = v * 11;
            const lat = Math.abs(v - 0.5) * 2;

            // Banding - more visible than Uranus
            let band = 0;
            band += Math.sin(v * Math.PI * 8) * 0.12;
            band += Math.sin(v * Math.PI * 4) * 0.08;
            band += Noise.fbm(x * 0.5, y * 0.3, 3, 80) * 0.15;

            // Wind shear patterns
            const windShear = Noise.fbm(x * 1.2 + Math.sin(y * 2) * 3, y * 0.5, 4, 81);
            band += windShear * 0.1;

            // Great Dark Spot and smaller storms
            let darkSpot = 0;
            const spotX = 0.35, spotY = 0.45;
            const spotDist = Math.sqrt(Math.pow((u - spotX) * 1.5, 2) + Math.pow(v - spotY, 2));
            if (spotDist < 0.06) {
                darkSpot = 1 - spotDist / 0.06;
                const vortex = Math.sin(Math.atan2(v - spotY, u - spotX) * 3 - spotDist * 40);
                darkSpot *= 0.7 + 0.3 * vortex;
            }

            // Scooter and other white clouds
            let whiteClouds = 0;
            const cloudNoise = Noise.ridged(x * 2, y * 1.2, 4, 82);
            if (cloudNoise > 0.6) {
                whiteClouds = (cloudNoise - 0.6) * 1.5;
            }
            // Bright companion clouds near dark spot
            if (spotDist > 0.05 && spotDist < 0.1) {
                const companionCloud = Noise.fbm(x * 4, y * 4, 2, 83);
                if (companionCloud > 0.6) {
                    whiteClouds += (companionCloud - 0.6) * 2;
                }
            }

            // South polar features
            if (lat > 0.75) {
                const polarCloud = Noise.fbm(x * 3, y * 3, 3, 84);
                whiteClouds += polarCloud * 0.3 * (lat - 0.75) / 0.25;
            }

            band = band * 0.5 + 0.5;

            // Deep blue color with slight variation
            let r = Math.floor(35 + band * 30);
            let g = Math.floor(80 + band * 55);
            let b = Math.floor(180 + band * 45);

            // Apply dark spot
            if (darkSpot > 0.1) {
                r = Math.floor(r * (1 - darkSpot * 0.4));
                g = Math.floor(g * (1 - darkSpot * 0.3));
                b = Math.floor(b * (1 - darkSpot * 0.15));
            }

            // Apply white clouds (high altitude methane ice)
            if (whiteClouds > 0.1) {
                const cloudBlend = Math.min(1, whiteClouds);
                r = Math.floor(r + (240 - r) * cloudBlend * 0.7);
                g = Math.floor(g + (245 - g) * cloudBlend * 0.7);
                b = Math.floor(b + (255 - b) * cloudBlend * 0.5);
            }

            return { r: Math.min(255, r), g: Math.min(255, g), b: Math.min(255, b) };
        });
    }

    // CERES - Rocky dwarf planet with bright spots
    static createCeresTexture() {
        return this.createTexture(512, 256, (u, v) => {
            const x = u * 20;
            const y = v * 10;

            let terrain = Noise.fbm(x, y, 4, 200) * 0.5 + 0.5;

            // Craters
            terrain += Noise.turbulence(x * 3, y * 3, 4, 201) * 0.15;

            // Bright salt deposits (Occator crater)
            const spots = Noise.fbm(x * 2, y * 2, 3, 202);
            let brightness = 0;
            if (spots > 0.8) {
                brightness = (spots - 0.8) * 3;
            }

            const base = Math.floor(terrain * 100 + 80);
            return {
                r: Math.min(255, base + brightness * 150),
                g: Math.min(255, base + brightness * 160),
                b: Math.min(255, base - 10 + brightness * 140)
            };
        });
    }

    // PLUTO - Heart-shaped nitrogen ice, pinkish-brown
    static createPlutoTexture() {
        return this.createTexture(512, 256, (u, v) => {
            const x = u * 15;
            const y = v * 8;

            let terrain = Noise.fbm(x, y, 3, 210) * 0.4 + 0.5;

            // Tombaugh Regio (heart shape) - brighter region
            const heartX = 0.4, heartY = 0.5;
            const heartDist = Math.sqrt((u - heartX) ** 2 * 2 + (v - heartY) ** 2 * 4);
            let heart = 0;
            if (heartDist < 0.25) {
                heart = 1 - heartDist / 0.25;
            }

            // Dark regions
            const dark = Noise.fbm(x * 0.8, y * 0.8, 4, 211);

            let r, g, b;
            if (heart > 0.3) {
                // Nitrogen ice plains - bright
                r = Math.floor(220 + heart * 30);
                g = Math.floor(210 + heart * 35);
                b = Math.floor(200 + heart * 40);
            } else if (dark < 0.4) {
                // Dark regions - reddish brown
                r = Math.floor(120 + terrain * 40);
                g = Math.floor(90 + terrain * 30);
                b = Math.floor(80 + terrain * 25);
            } else {
                // Standard surface - pinkish tan
                r = Math.floor(180 + terrain * 40);
                g = Math.floor(160 + terrain * 35);
                b = Math.floor(150 + terrain * 30);
            }

            return { r, g, b };
        });
    }

    // HAUMEA - Elongated, icy white
    static createHaumeaTexture() {
        return this.createTexture(512, 256, (u, v) => {
            const x = u * 12;
            const y = v * 6;

            let ice = Noise.fbm(x, y, 4, 220) * 0.3 + 0.7;

            // Dark spot (red region)
            const spot = Noise.fbm(x * 0.5, y * 0.5, 3, 221);
            let red = 0;
            if (spot > 0.7 && u > 0.3 && u < 0.5) {
                red = (spot - 0.7) * 2;
            }

            return {
                r: Math.floor(220 + ice * 35 + red * 40),
                g: Math.floor(225 + ice * 30 - red * 30),
                b: Math.floor(235 + ice * 20 - red * 50)
            };
        });
    }

    // MAKEMAKE - Reddish-brown methane ice
    static createMakemakeTexture() {
        return this.createTexture(512, 256, (u, v) => {
            const x = u * 12;
            const y = v * 6;

            let terrain = Noise.fbm(x, y, 3, 230) * 0.4 + 0.5;
            const methane = Noise.fbm(x * 1.5, y * 1.5, 3, 231) * 0.2;

            return {
                r: Math.floor(200 + terrain * 40 + methane * 30),
                g: Math.floor(160 + terrain * 35),
                b: Math.floor(140 + terrain * 30)
            };
        });
    }

    // ERIS - Bright white/grey methane ice
    static createErisTexture() {
        return this.createTexture(512, 256, (u, v) => {
            const x = u * 12;
            const y = v * 6;

            let ice = Noise.fbm(x, y, 3, 240) * 0.25 + 0.75;
            const variation = Noise.fbm(x * 2, y * 2, 3, 241) * 0.1;

            const brightness = Math.floor(ice * 200 + 55 + variation * 30);
            return {
                r: brightness,
                g: brightness + 2,
                b: brightness + 5
            };
        });
    }

    // SATURN RINGS - Highly detailed with realistic structure
    static createRingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        for (let x = 0; x < 1024; x++) {
            const u = x / 1024;
            let density = 0;
            let colorTint = 0; // 0 = neutral, positive = warm, negative = cool

            // D Ring (innermost, very faint)
            if (u > 0.02 && u < 0.08) {
                density = 0.12 + Noise.fbm(u * 300, 0, 3, 89) * 0.1;
                colorTint = -0.1;
            }

            // C Ring (inner, translucent grey-blue)
            if (u > 0.08 && u < 0.22) {
                density = 0.25 + Noise.fbm(u * 200, 0, 4, 90) * 0.2;
                // Colombo Gap
                if (u > 0.11 && u < 0.115) density *= 0.3;
                // Maxwell Gap
                if (u > 0.16 && u < 0.165) density *= 0.2;
                colorTint = -0.05;
            }

            // B Ring (brightest and densest, cream/tan colored)
            if (u > 0.25 && u < 0.50) {
                const bRingPos = (u - 0.25) / 0.25;
                density = 0.85 + Noise.fbm(u * 150, 0, 3, 91) * 0.12;
                // Fine ringlet structure
                density += Math.sin(u * 400) * 0.03;
                colorTint = 0.15 + bRingPos * 0.1;
            }

            // Cassini Division (prominent gap)
            if (u > 0.50 && u < 0.545) {
                density = 0.05 + Noise.fbm(u * 400, 0, 2, 93) * 0.05;
                // Huygens Gap within Cassini Division
                if (u > 0.51 && u < 0.52) density = 0.02;
                colorTint = -0.1;
            }

            // A Ring (medium brightness, has Encke Gap)
            if (u > 0.545 && u < 0.75) {
                density = 0.65 + Noise.fbm(u * 100, 0, 3, 94) * 0.18;
                // Encke Gap
                if (u > 0.69 && u < 0.70) density = 0.03;
                colorTint = 0.08;
            }

            // F Ring (thin outer ring)
            if (u > 0.78 && u < 0.82) {
                const fCenter = 0.80;
                const fDist = Math.abs(u - fCenter);
                density = Math.max(0, 0.6 - fDist * 20);
                colorTint = 0.05;
            }

            // Color: cream/tan with subtle variation
            density = Math.max(0, Math.min(1, density));
            const baseBrightness = density * 230 + 25;
            const r = Math.min(255, Math.floor(baseBrightness + colorTint * 40));
            const g = Math.min(255, Math.floor(baseBrightness + colorTint * 20));
            const b = Math.min(255, Math.floor(baseBrightness - colorTint * 20));

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.globalAlpha = Math.min(0.95, density * 0.95);
            ctx.fillRect(x, 0, 1, 32);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        return texture;
    }

    // STARFIELD - Deep space with Milky Way and stars
    static createStarfieldTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Deep space background
        ctx.fillStyle = '#000306';
        ctx.fillRect(0, 0, 2048, 1024);

        // Subtle color variations
        for (let i = 0; i < 4; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 1024;
            const r = Math.random() * 500 + 300;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, `rgba(40, 30, 60, 0.15)`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 2048, 1024);
        }

        // ========== MILKY WAY GALACTIC BAND ==========
        ctx.save();
        ctx.translate(1024, 512);
        ctx.rotate(-0.35);

        // Dark dust lanes
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 2800;
            const y = (Math.random() - 0.5) * 100;
            const w = Math.random() * 200 + 50;
            const h = Math.random() * 30 + 10;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        // Galactic core glow
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
        coreGrad.addColorStop(0, 'rgba(255, 245, 220, 0.15)');
        coreGrad.addColorStop(0.5, 'rgba(220, 200, 180, 0.06)');
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(-250, -250, 500, 500);

        // Galactic band glow
        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 3000;
            const y = (Math.random() - 0.5) * 150;
            const r = Math.random() * 80 + 30;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'rgba(220, 210, 230, 0.04)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }

        // Milky Way stars
        for (let i = 0; i < 2000; i++) {
            const x = (Math.random() - 0.5) * 2800;
            const bandWidth = 120 * (1 - Math.abs(x) / 2000);
            const y = (Math.random() - 0.5) * bandWidth;
            const size = Math.random() * 0.6 + 0.2;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 252, 248, ${Math.random() * 0.5 + 0.3})`;
            ctx.fill();
        }
        ctx.restore();

        // ========== NEBULAE (simplified) ==========
        const nebulae = [
            { x: 400, y: 200, size: 150, r: 180, g: 50, b: 80 },
            { x: 1600, y: 300, size: 120, r: 60, g: 100, b: 160 },
            { x: 1400, y: 800, size: 180, r: 120, g: 40, b: 100 },
            { x: 250, y: 700, size: 100, r: 40, g: 120, b: 130 },
        ];

        for (const neb of nebulae) {
            for (let j = 0; j < 5; j++) {
                const offsetX = (Math.random() - 0.5) * neb.size;
                const offsetY = (Math.random() - 0.5) * neb.size * 0.6;
                const r = neb.size * (0.4 + Math.random() * 0.4);
                const grad = ctx.createRadialGradient(
                    neb.x + offsetX, neb.y + offsetY, 0,
                    neb.x + offsetX, neb.y + offsetY, r
                );
                grad.addColorStop(0, `rgba(${neb.r + 30}, ${neb.g + 20}, ${neb.b + 40}, 0.06)`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 2048, 1024);
            }
        }

        // ========== DISTANT GALAXIES (simplified) ==========
        const galaxies = [
            { x: 300, y: 400, size: 15 },
            { x: 1700, y: 200, size: 12 },
            { x: 1100, y: 850, size: 18 },
        ];

        for (const gal of galaxies) {
            const galGrad = ctx.createRadialGradient(gal.x, gal.y, 0, gal.x, gal.y, gal.size);
            galGrad.addColorStop(0, 'rgba(255, 248, 230, 0.5)');
            galGrad.addColorStop(0.5, 'rgba(255, 240, 200, 0.2)');
            galGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = galGrad;
            ctx.beginPath();
            ctx.ellipse(gal.x, gal.y, gal.size * 1.3, gal.size * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ========== STAR CLUSTERS ==========
        const clusters = [
            { x: 1000, y: 600, count: 40, spread: 50 },
            { x: 3000, y: 1400, count: 35, spread: 40 },
            { x: 2400, y: 900, count: 50, spread: 60 },
            { x: 700, y: 1600, count: 30, spread: 35 },
        ];

        for (const cluster of clusters) {
            // Faint glow around cluster
            const clusterGrad = ctx.createRadialGradient(cluster.x, cluster.y, 0, cluster.x, cluster.y, cluster.spread * 1.5);
            clusterGrad.addColorStop(0, 'rgba(200, 210, 255, 0.05)');
            clusterGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = clusterGrad;
            ctx.fillRect(cluster.x - cluster.spread * 2, cluster.y - cluster.spread * 2, cluster.spread * 4, cluster.spread * 4);

            // Cluster stars
            for (let i = 0; i < cluster.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * cluster.spread * Math.random(); // Concentrated toward center
                const x = cluster.x + Math.cos(angle) * dist;
                const y = cluster.y + Math.sin(angle) * dist;
                const size = Math.random() * 1.2 + 0.5;
                const brightness = Math.random() * 0.4 + 0.6;

                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(220, 230, 255, ${brightness})`;
                ctx.fill();
            }
        }

        // ========== BACKGROUND STARS - Realistic Distribution ==========
        // Tiny distant stars (most numerous)
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 1024;
            const size = Math.random() * 0.6 + 0.2;
            const brightness = Math.random() * 0.4 + 0.15;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.fill();
        }

        // Medium stars with realistic color temperature distribution
        // Based on stellar classification: O, B, A, F, G, K, M
        const starColors = [
            { r: 155, g: 176, b: 255, weight: 0.01 },  // O - Blue (rare)
            { r: 170, g: 191, b: 255, weight: 0.02 },  // B - Blue-white
            { r: 202, g: 215, b: 255, weight: 0.05 },  // A - White
            { r: 248, g: 247, b: 255, weight: 0.08 },  // F - Yellow-white
            { r: 255, g: 244, b: 234, weight: 0.10 },  // G - Yellow (Sun-like)
            { r: 255, g: 210, b: 161, weight: 0.15 },  // K - Orange
            { r: 255, g: 204, b: 111, weight: 0.20 },  // K - Light orange
            { r: 255, g: 170, b: 124, weight: 0.25 },  // M - Red-orange (most common)
            { r: 255, g: 140, b: 100, weight: 0.14 },  // M - Red
        ];

        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 1024;
            const size = Math.random() * 1.3 + 0.6;
            const brightness = Math.random() * 0.5 + 0.5;

            // Select color based on weight distribution
            let rand = Math.random();
            let color = starColors[starColors.length - 1];
            let cumWeight = 0;
            for (const c of starColors) {
                cumWeight += c.weight;
                if (rand < cumWeight) {
                    color = c;
                    break;
                }
            }

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${brightness})`;
            ctx.fill();
        }

        // ========== BRIGHT FEATURE STARS - Natural soft glow ==========
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 1024;
            const size = Math.random() * 2 + 1;
            const brightness = Math.random() * 0.3 + 0.7;

            // Color based on temperature
            const temp = Math.random();
            let r, g, b;
            if (temp < 0.15) {
                r = 180; g = 210; b = 255; // Hot blue
            } else if (temp < 0.3) {
                r = 255; g = 252; b = 250; // White
            } else if (temp < 0.6) {
                r = 255; g = 244; b = 225; // Yellow-white
            } else if (temp < 0.8) {
                r = 255; g = 210; b = 170; // Orange
            } else {
                r = 255; g = 175; b = 140; // Red-orange
            }

            // Soft outer glow
            const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 8);
            outerGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${brightness * 0.15})`);
            outerGlow.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${brightness * 0.05})`);
            outerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(x, y, size * 8, 0, Math.PI * 2);
            ctx.fill();

            // Inner glow
            const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            innerGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${brightness * 0.6})`);
            innerGlow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${brightness * 0.2})`);
            innerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Bright core
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.fill();
        }

        // ========== VERY BRIGHT STARS - Soft natural glow ==========
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 1024;
            const size = Math.random() * 2.5 + 2;

            // Color variation
            const temp = Math.random();
            let r, g, b;
            if (temp < 0.3) {
                r = 200; g = 220; b = 255; // Blue-white
            } else if (temp < 0.7) {
                r = 255; g = 250; b = 245; // Pure white
            } else {
                r = 255; g = 235; b = 210; // Warm white
            }

            // Very soft outer halo
            const halo = ctx.createRadialGradient(x, y, 0, x, y, size * 15);
            halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.1)`);
            halo.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.03)`);
            halo.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.01)`);
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(x, y, size * 15, 0, Math.PI * 2);
            ctx.fill();

            // Medium glow layer
            const midGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 6);
            midGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
            midGlow.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.15)`);
            midGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = midGlow;
            ctx.beginPath();
            ctx.arc(x, y, size * 6, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright glow
            const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
            innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            innerGlow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`);
            innerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Bright white core
            ctx.beginPath();
            ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.fill();
        }

        return new THREE.CanvasTexture(canvas);
    }
}

// ============================================
// PLANET DATA
// ============================================

// Astronomical Data (Accurate)
// Distances in AU (1 AU = Earth-Sun distance = 149.6M km)
// Orbital periods in Earth days
// Radii relative to Earth (Earth = 1)
// Using scaled values for visualization while maintaining accurate proportions

const AU = 100; // 1 AU = 100 units for visualization
const EARTH_RADIUS = 6; // Earth's visual radius

// Distance compression factor for better visualization
// Compresses outer planets more than inner planets for better visual spacing
const DISTANCE_COMPRESSION = 0.5; // Compress all distances by 50%
const ORBIT_OFFSET = 25; // Minimum orbit offset to keep planets outside Sun's visual radius

const PLANETS = [
    {
        name: "Sun",
        radius: EARTH_RADIUS * 109 * 0.045,
        orbitRadius: 0,
        period: 0,
        isStar: true,
        axialTilt: 7.25,
        rotationPeriod: 609.12,
        distance: "—",
        diameter: "1,392,700 km",
        mass: "333,000",
        gravity: "274 m/s²",
        temperature: "5,500°C (surface)",
        dayLength: "25.4 Earth days",
        moonCount: "8 planets",
        atmosphere: "The Photosphere & Corona. The Sun is a ball of plasma burning at 5,500°C. Makes up 99.8% of Solar System's mass.",
        environment: "Nuclear fusion engine converting hydrogen to helium. Everything orbits this cosmic boss. Solar wind extends the heliosphere past Pluto."
    },
    {
        name: "Mercury",
        radius: EARTH_RADIUS * 0.38,
        orbitRadius: AU * 0.39,
        period: 88,
        eccentricity: 0.206,
        inclination: 7.0,
        argPerihelion: 29.1,
        axialTilt: 0.034,
        rotationPeriod: 1407.6,
        distance: "57.9M km (0.39 AU)",
        diameter: "4,879 km",
        mass: "0.055",
        gravity: "3.7 m/s²",
        temperature: "167°C (avg)",
        dayLength: "58.6 Earth days",
        moonCount: "0",
        zone: "inner",
        atmosphere: "Virtually no atmosphere - just a thin exosphere of atoms blasted off by solar wind. Extreme temperature swings from -180°C to 430°C.",
        environment: "Heavily cratered surface similar to our Moon. Weak magnetic field only 1% of Earth's strength. Terrestrial rocky planet."
    },
    {
        name: "Venus",
        radius: EARTH_RADIUS * 0.95,
        orbitRadius: AU * 0.72,
        period: 225,
        eccentricity: 0.007,
        inclination: 3.4,
        argPerihelion: 55.2,
        axialTilt: 177.4,
        rotationPeriod: -5832.5,
        distance: "108.2M km (0.72 AU)",
        diameter: "12,104 km",
        mass: "0.815",
        gravity: "8.87 m/s²",
        temperature: "464°C",
        dayLength: "243 Earth days",
        moonCount: "0",
        zone: "inner",
        atmosphere: "Thick CO2 atmosphere with sulfuric acid clouds. Surface pressure 90x Earth's. Temperature reaches 465°C - hottest planet.",
        environment: "Runaway greenhouse effect. Retrograde rotation. Surface hidden beneath permanent cloud cover. Terrestrial rocky planet."
    },
    {
        name: "Earth",
        radius: EARTH_RADIUS,
        orbitRadius: AU * 1.0,
        period: 365,
        eccentricity: 0.017,
        inclination: 0.0,
        argPerihelion: 114.2,
        axialTilt: 23.44,
        rotationPeriod: 23.93,
        distance: "149.6M km (1.0 AU)",
        diameter: "12,742 km",
        mass: "1.0",
        gravity: "9.81 m/s²",
        temperature: "15°C (avg)",
        dayLength: "24 hours",
        moonCount: "1",
        zone: "inner",
        moons: [
            { name: "Moon", orbitRadius: 8, period: 27.3, radius: EARTH_RADIUS * 0.27, color: 0xaaaaaa }
        ],
        atmosphere: "78% nitrogen, 21% oxygen. Ozone layer blocks UV radiation. Water exists in all three states.",
        environment: "Strong magnetic field extends 65,000 km. Only known planet with active plate tectonics and life. Terrestrial rocky planet."
    },
    {
        name: "Mars",
        radius: EARTH_RADIUS * 0.53,
        orbitRadius: AU * 1.52,
        period: 687,
        eccentricity: 0.094,
        inclination: 1.9,
        argPerihelion: 286.5,
        axialTilt: 25.19,
        rotationPeriod: 24.62,
        distance: "227.9M km (1.52 AU)",
        diameter: "6,779 km",
        mass: "0.107",
        gravity: "3.71 m/s²",
        temperature: "-65°C (avg)",
        dayLength: "24.6 hours",
        moonCount: "2",
        zone: "inner",
        moons: [
            { name: "Phobos", orbitRadius: 5, period: 0.32, radius: EARTH_RADIUS * 0.02, color: 0x8a7d6d },
            { name: "Deimos", orbitRadius: 7, period: 1.26, radius: EARTH_RADIUS * 0.01, color: 0x9c8b7a }
        ],
        atmosphere: "Thin CO2 atmosphere, less than 1% of Earth's pressure. Dust storms can engulf the entire planet.",
        environment: "Rusty red iron oxide surface. Olympus Mons - largest volcano. Valles Marineris - massive canyon system. Terrestrial rocky planet."
    },
    {
        name: "Ceres",
        radius: EARTH_RADIUS * 0.07 * 3,
        orbitRadius: AU * 2.77,
        period: 1682,
        eccentricity: 0.079,
        inclination: 10.6,
        argPerihelion: 73.6,
        axialTilt: 4.0,
        rotationPeriod: 9.07,
        distance: "413M km (2.77 AU)",
        diameter: "940 km",
        mass: "0.00016",
        gravity: "0.28 m/s²",
        temperature: "-105°C (avg)",
        dayLength: "9 hours",
        moonCount: "0",
        isDwarf: true,
        atmosphere: "Extremely thin, transient atmosphere with water vapor detected. Surface temperature around -105°C.",
        environment: "Largest object in the Asteroid Belt. Dwarf planet with subsurface ocean. Bright spots are salt deposits. Home of the asteroid belt."
    },
    {
        name: "Jupiter",
        radius: EARTH_RADIUS * 11.2 * 0.4,
        orbitRadius: AU * 5.20,
        period: 4333,
        eccentricity: 0.049,
        inclination: 1.3,
        argPerihelion: 14.8,
        axialTilt: 3.13,
        rotationPeriod: 9.93,
        distance: "778.5M km (5.20 AU)",
        diameter: "139,820 km",
        mass: "317.8",
        gravity: "24.79 m/s²",
        temperature: "-110°C (cloud top)",
        dayLength: "9.9 hours",
        moonCount: "95",
        zone: "gas",
        moons: [
            { name: "Io", orbitRadius: 12, period: 1.77, radius: EARTH_RADIUS * 0.29, color: 0xffff66 },
            { name: "Europa", orbitRadius: 16, period: 3.55, radius: EARTH_RADIUS * 0.25, color: 0xccddff },
            { name: "Ganymede", orbitRadius: 22, period: 7.15, radius: EARTH_RADIUS * 0.41, color: 0xaabbcc },
            { name: "Callisto", orbitRadius: 30, period: 16.69, radius: EARTH_RADIUS * 0.38, color: 0x888899 }
        ],
        atmosphere: "Hydrogen and helium atmosphere with ammonia clouds. Great Red Spot storm larger than Earth, raging for 400+ years.",
        environment: "Strongest magnetic field. 95 known moons. Gas giant with massive gravity. Has faint rings too!"
    },
    {
        name: "Saturn",
        radius: EARTH_RADIUS * 9.45 * 0.4,
        orbitRadius: AU * 9.58,
        period: 10759,
        eccentricity: 0.057,
        inclination: 2.5,
        argPerihelion: 92.9,
        hasRings: true,
        axialTilt: 26.73,
        rotationPeriod: 10.7,
        distance: "1.43B km (9.58 AU)",
        diameter: "116,460 km",
        mass: "95.2",
        gravity: "10.44 m/s²",
        temperature: "-140°C (cloud top)",
        dayLength: "10.7 hours",
        moonCount: "146",
        zone: "gas",
        moons: [
            { name: "Mimas", orbitRadius: 10, period: 0.94, radius: EARTH_RADIUS * 0.03, color: 0xcccccc },
            { name: "Enceladus", orbitRadius: 12, period: 1.37, radius: EARTH_RADIUS * 0.04, color: 0xffffff },
            { name: "Tethys", orbitRadius: 14, period: 1.89, radius: EARTH_RADIUS * 0.08, color: 0xe8e8e8 },
            { name: "Dione", orbitRadius: 17, period: 2.74, radius: EARTH_RADIUS * 0.09, color: 0xdddddd },
            { name: "Rhea", orbitRadius: 22, period: 4.52, radius: EARTH_RADIUS * 0.12, color: 0xd0d0d0 },
            { name: "Titan", orbitRadius: 28, period: 15.95, radius: EARTH_RADIUS * 0.40, color: 0xffaa55 },
            { name: "Iapetus", orbitRadius: 38, period: 79.32, radius: EARTH_RADIUS * 0.11, color: 0x8b6914 }
        ],
        atmosphere: "Similar to Jupiter - hydrogen/helium with ammonia crystals giving golden hue. Wind speeds up to 1,800 km/h.",
        environment: "Spectacular ring system made of ice and rock. Hexagonal polar vortex. 146 known moons including Titan. Gas giant."
    },
    {
        name: "Uranus",
        radius: EARTH_RADIUS * 4.0 * 0.5,
        orbitRadius: AU * 19.22,
        period: 30687,
        eccentricity: 0.046,
        inclination: 0.8,
        argPerihelion: 172.4,
        hasRings: true,
        axialTilt: 97.77,
        rotationPeriod: -17.24,
        distance: "2.87B km (19.22 AU)",
        diameter: "50,724 km",
        mass: "14.5",
        gravity: "8.87 m/s²",
        temperature: "-224°C",
        dayLength: "17.2 hours",
        moonCount: "28",
        zone: "ice",
        moons: [
            { name: "Miranda", orbitRadius: 8, period: 1.41, radius: EARTH_RADIUS * 0.04, color: 0xaaaaaa },
            { name: "Ariel", orbitRadius: 11, period: 2.52, radius: EARTH_RADIUS * 0.09, color: 0xc8c8c8 },
            { name: "Umbriel", orbitRadius: 14, period: 4.14, radius: EARTH_RADIUS * 0.09, color: 0x6b6b6b },
            { name: "Titania", orbitRadius: 18, period: 8.71, radius: EARTH_RADIUS * 0.12, color: 0xb8b8b8 },
            { name: "Oberon", orbitRadius: 23, period: 13.46, radius: EARTH_RADIUS * 0.12, color: 0xa0a0a0 }
        ],
        atmosphere: "Ice giant - water, methane, ammonia. Methane absorbs red light giving cyan color. Extremely cold: -224°C.",
        environment: "Rotates on its side (98° axial tilt). Faint ring system. Rich in water, methane, ammonia. Extreme winds."
    },
    {
        name: "Neptune",
        radius: EARTH_RADIUS * 3.88 * 0.5,
        orbitRadius: AU * 30.05,
        period: 60190,
        eccentricity: 0.009,
        inclination: 1.8,
        argPerihelion: 46.7,
        axialTilt: 28.32,
        rotationPeriod: 16.11,
        distance: "4.50B km (30.05 AU)",
        diameter: "49,528 km",
        mass: "17.1",
        gravity: "11.15 m/s²",
        temperature: "-214°C",
        dayLength: "16.1 hours",
        moonCount: "16",
        zone: "ice",
        moons: [
            { name: "Proteus", orbitRadius: 10, period: 1.12, radius: EARTH_RADIUS * 0.06, color: 0x777777 },
            { name: "Triton", orbitRadius: 16, period: 5.88, radius: EARTH_RADIUS * 0.21, color: 0xddccbb },
            { name: "Nereid", orbitRadius: 24, period: 360.14, radius: EARTH_RADIUS * 0.05, color: 0x999999 }
        ],
        atmosphere: "Ice giant with fastest winds in solar system at 2,100 km/h. Vivid blue from methane.",
        environment: "Great Dark Spot storms. Triton - large moon with geysers. Ice giant, cold and distant. Marks inner edge of Kuiper Belt."
    },
    {
        name: "Pluto",
        radius: EARTH_RADIUS * 0.18 * 2,
        orbitRadius: AU * 39.48,
        period: 90560,
        eccentricity: 0.248,
        inclination: 17.2,
        argPerihelion: 113.8,
        axialTilt: 122.53,
        rotationPeriod: -153.3,
        distance: "5.91B km (39.48 AU)",
        diameter: "2,377 km",
        mass: "0.0022",
        gravity: "0.62 m/s²",
        temperature: "-230°C",
        dayLength: "6.4 Earth days",
        moonCount: "5",
        isDwarf: true,
        moons: [
            { name: "Charon", orbitRadius: 6, period: 6.39, radius: EARTH_RADIUS * 0.12, color: 0x9a9a9a },
            { name: "Nix", orbitRadius: 10, period: 24.85, radius: EARTH_RADIUS * 0.025, color: 0xbbbbbb },
            { name: "Hydra", orbitRadius: 13, period: 38.20, radius: EARTH_RADIUS * 0.03, color: 0xbbbbbb },
            { name: "Kerberos", orbitRadius: 11, period: 32.17, radius: EARTH_RADIUS * 0.02, color: 0xaaaaaa },
            { name: "Styx", orbitRadius: 8, period: 20.16, radius: EARTH_RADIUS * 0.02, color: 0xaaaaaa }
        ],
        atmosphere: "Thin nitrogen, methane, carbon monoxide atmosphere that freezes and falls as snow when distant from Sun.",
        environment: "Heart-shaped nitrogen glacier (Tombaugh Regio). Five moons including Charon. King of the Kuiper Belt dwarf planets."
    },
    {
        name: "Haumea",
        radius: EARTH_RADIUS * 0.11 * 2,
        orbitRadius: AU * 43.13,
        period: 103774,
        eccentricity: 0.195,
        inclination: 28.2,
        argPerihelion: 239.2,
        hasRings: true,
        axialTilt: 126.0,
        rotationPeriod: 3.92,
        distance: "6.45B km (43.13 AU)",
        diameter: "1,632 km (avg)",
        mass: "0.00066",
        gravity: "0.44 m/s²",
        temperature: "-241°C",
        dayLength: "3.9 hours",
        moonCount: "2",
        isDwarf: true,
        moons: [
            { name: "Hi'iaka", orbitRadius: 8, period: 49.12, radius: EARTH_RADIUS * 0.025, color: 0xdddddd },
            { name: "Namaka", orbitRadius: 5, period: 18.28, radius: EARTH_RADIUS * 0.013, color: 0xcccccc }
        ],
        atmosphere: "No significant atmosphere. Surface covered in crystalline water ice. Elongated egg shape.",
        environment: "Fastest rotating dwarf planet (4-hour day). Has two moons and a ring system. Kuiper Belt object."
    },
    {
        name: "Makemake",
        radius: EARTH_RADIUS * 0.11 * 2,
        orbitRadius: AU * 45.79,
        period: 112897,
        eccentricity: 0.159,
        inclination: 29.0,
        argPerihelion: 294.8,
        axialTilt: 0,
        rotationPeriod: 22.48,
        distance: "6.85B km (45.79 AU)",
        diameter: "1,430 km",
        mass: "0.00050",
        gravity: "0.50 m/s²",
        temperature: "-243°C",
        dayLength: "22.5 hours",
        moonCount: "1",
        isDwarf: true,
        moons: [
            { name: "MK2", orbitRadius: 5, period: 12.4, radius: EARTH_RADIUS * 0.013, color: 0x444444 }
        ],
        atmosphere: "Possible thin atmosphere. Surface covered in methane, ethane, and nitrogen ices.",
        environment: "One of the brightest Kuiper Belt objects. Named after Rapa Nui creation deity. One known moon."
    },
    {
        name: "Eris",
        radius: EARTH_RADIUS * 0.18 * 2,
        orbitRadius: AU * 67.67,
        period: 204199,
        eccentricity: 0.441,
        inclination: 44.0,
        argPerihelion: 151.4,
        axialTilt: 78.0,
        rotationPeriod: 25.9,
        distance: "10.1B km (67.67 AU)",
        diameter: "2,326 km",
        mass: "0.0028",
        gravity: "0.82 m/s²",
        temperature: "-243°C",
        dayLength: "25.9 hours",
        moonCount: "1",
        isDwarf: true,
        moons: [
            { name: "Dysnomia", orbitRadius: 6, period: 15.77, radius: EARTH_RADIUS * 0.05, color: 0x888888 }
        ],
        atmosphere: "Thin atmosphere when closest to Sun, collapses when distant. Covered in methane ice.",
        environment: "Most massive known dwarf planet. Caused Pluto's reclassification. Has moon Dysnomia. Scattered disk object."
    }
];

// ============================================
// ORBITAL MECHANICS - REALISTIC ELLIPTICAL ORBITS
// ============================================

class OrbitalMechanics {
    /**
     * Solve Kepler's equation: M = E - e*sin(E)
     * Uses Newton's method for iterative solution
     */
    static solveKeplerEquation(meanAnomaly, eccentricity, iterations = 10) {
        let E = meanAnomaly; // Initial guess
        for (let i = 0; i < iterations; i++) {
            const delta = (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E));
            E -= delta;
            if (Math.abs(delta) < 1e-10) break;
        }
        return E;
    }

    /**
     * Calculate true anomaly from eccentric anomaly
     */
    static eccentricToTrueAnomaly(E, e) {
        const beta = e / (1 + Math.sqrt(1 - e * e));
        return E + 2 * Math.atan2(beta * Math.sin(E), 1 - beta * Math.cos(E));
    }

    /**
     * Calculate 3D position for elliptical orbit with inclination
     * @param {number} meanAnomaly - Mean anomaly in radians
     * @param {number} semiMajorAxis - Semi-major axis
     * @param {number} eccentricity - Orbital eccentricity (0-1)
     * @param {number} inclination - Orbital inclination in degrees
     * @param {number} argPerihelion - Argument of perihelion in degrees
     * @returns {THREE.Vector3} Position in 3D space
     */
    static calculatePosition(meanAnomaly, semiMajorAxis, eccentricity, inclination, argPerihelion) {
        // Apply distance compression for better visualization
        const compressedAxis = semiMajorAxis * DISTANCE_COMPRESSION + ORBIT_OFFSET;

        // Solve Kepler's equation for eccentric anomaly
        const E = this.solveKeplerEquation(meanAnomaly, eccentricity);

        // Convert to true anomaly
        const nu = this.eccentricToTrueAnomaly(E, eccentricity);

        // Calculate distance from focus (Sun)
        const ecc2 = eccentricity * eccentricity;
        const distance = compressedAxis * (1 - ecc2) / (1 + eccentricity * Math.cos(nu));

        // Convert angles to radians using cached constant
        const inc = inclination * DEG_TO_RAD;
        const omega = argPerihelion * DEG_TO_RAD;

        // Pre-calculate trig values
        const cosNu = Math.cos(nu);
        const sinNu = Math.sin(nu);
        const cosOmega = Math.cos(omega);
        const sinOmega = Math.sin(omega);
        const sinInc = Math.sin(inc);
        const cosInc = Math.cos(inc);

        // Calculate position in orbital plane
        const xOrbital = distance * cosNu;
        const yOrbital = distance * sinNu;

        // Rotate to account for argument of perihelion
        const xRot = xOrbital * cosOmega - yOrbital * sinOmega;
        const yRot = xOrbital * sinOmega + yOrbital * cosOmega;

        // Apply inclination (rotate around X axis)
        return new THREE.Vector3(xRot, yRot * sinInc, yRot * cosInc);
    }

    /**
     * Calculate mean motion (angular speed) from period
     */
    static calculateMeanMotion(period, speedMultiplier = 1) {
        // Period is in Earth days, convert to animation time units
        return TWO_PI / (period * 0.1) * speedMultiplier;
    }
}

const STATE = { IDLE: 0, CHASE: 1, LOCKED: 2 };

// Camera view presets (adjusted for accurate AU scale)
const VIEWS = {
    top: { position: new THREE.Vector3(0, AU * 15, 0), target: new THREE.Vector3(0, 0, 0) },
    side: { position: new THREE.Vector3(AU * 12, AU * 1, 0), target: new THREE.Vector3(0, 0, 0) },
    angle: { position: new THREE.Vector3(AU * 3, AU * 4, AU * 6), target: new THREE.Vector3(0, 0, 0) }
};

// ============================================
// MAIN CLASS
// ============================================

class SolarSystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.bodies = {};
        this.meshes = [];
        this.orbitLines = [];
        this.glowMeshes = [];
        this.atmosphereMeshes = [];
        this.asteroidBelt = null;
        this.kuiperBelt = null;
        this.moonSystems = {}; // Separate containers for moons (don't rotate with planet)
        this.allMoons = []; // All moon meshes for raycasting
        this.hoveredMoon = null;
        this.state = STATE.IDLE;

        // Reusable objects to reduce GC (Performance)
        this._tempVec3 = new THREE.Vector3();
        this._tempQuat = new THREE.Quaternion();
        this._rotAxis = new THREE.Vector3();
        this.target = null;
        this.chaseStart = 0;
        this.startCamPos = new THREE.Vector3();
        this.startTarget = new THREE.Vector3();
        this.speed = 1;
        this.showOrbits = true;
        this.showLabels = true;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        // Cached DOM elements (performance)
        this._domCache = null;

        // Label pooling (performance)
        this._labelPool = [];
        this._activeLabelCount = 0;

        // View transition
        this.currentView = 'angle';
        this.viewTransition = false;
        this.viewTransitionStart = 0;
        this.viewStartPos = new THREE.Vector3();
        this.viewEndPos = new THREE.Vector3();
        this.viewStartTarget = new THREE.Vector3();
        this.viewEndTarget = new THREE.Vector3();

        this.init();
    }

    init() {
        const canvas = document.getElementById('solarSystem');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x020205);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200000);
        this.camera.position.set(AU * 3, AU * 4, AU * 6);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = AU * 0.8; // Allow closer zoom now that Sun is smaller
        this.controls.maxDistance = AU * 100; // Increased max distance for better zoom out

        // ENHANCED LIGHTING (scaled for AU distances)
        // Main sun light - reaches entire solar system
        this.sunLight = new THREE.PointLight(0xfffaf0, 3, AU * 80, 1.8);
        this.scene.add(this.sunLight);

        // Secondary sun warmth for inner planets
        const sunWarmth = new THREE.PointLight(0xffaa44, 2, AU * 10, 2);
        this.scene.add(sunWarmth);

        // Hemisphere light for softer shadows
        const hemiLight = new THREE.HemisphereLight(0x8888cc, 0x442211, 0.3);
        this.scene.add(hemiLight);

        // Ambient light so outer planets are always visible
        this.scene.add(new THREE.AmbientLight(0x404060, 0.4));

        this.createSkybox();
        this.createBodies();
        this.createOrbits();
        this.createAsteroidBelt();
        this.createKuiperBelt();
        this.setupUI();
        this.setupEvents();

        document.getElementById('loading').style.display = 'none';

        // Cache DOM elements for performance
        this._domCache = {
            planetName: document.getElementById('planet-name'),
            statPeriod: document.getElementById('stat-period'),
            statDistance: document.getElementById('stat-distance'),
            statDiameter: document.getElementById('stat-diameter'),
            statMass: document.getElementById('stat-mass'),
            statGravity: document.getElementById('stat-gravity'),
            statTemperature: document.getElementById('stat-temperature'),
            statDay: document.getElementById('stat-day'),
            statMoons: document.getElementById('stat-moons'),
            infoAtmosphere: document.getElementById('info-atmosphere'),
            infoEnvironment: document.getElementById('info-environment'),
            infoPanel: document.getElementById('info-panel'),
            exitFocus: document.getElementById('exit-focus')
        };

        this.animate();
    }

    createSkybox() {
        const geo = new THREE.SphereGeometry(AU * 500, 64, 64); // Far beyond solar system
        const mat = new THREE.MeshBasicMaterial({
            map: TextureGenerator.createStarfieldTexture(),
            side: THREE.BackSide
        });
        this.scene.add(new THREE.Mesh(geo, mat));
    }

    createAtmosphere(radius, color, opacity = 0.3, scale = 1.08) {
        const geo = new THREE.SphereGeometry(radius * scale, 64, 64);
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: { value: new THREE.Color(color) },
                intensity: { value: opacity }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                uniform vec3 glowColor;
                uniform float intensity;
                void main() {
                    float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                    rim = pow(rim, 2.5);
                    gl_FragColor = vec4(glowColor, rim * intensity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false
        });
        return new THREE.Mesh(geo, mat);
    }

    createBodies() {
        const textureMap = {
            Sun: TextureGenerator.createSunTexture(),
            Mercury: TextureGenerator.createMercuryTexture(),
            Venus: TextureGenerator.createVenusTexture(),
            Earth: TextureGenerator.createEarthTexture(),
            Mars: TextureGenerator.createMarsTexture(),
            Ceres: TextureGenerator.createCeresTexture(),
            Jupiter: TextureGenerator.createJupiterTexture(),
            Saturn: TextureGenerator.createSaturnTexture(),
            Uranus: TextureGenerator.createUranusTexture(),
            Neptune: TextureGenerator.createNeptuneTexture(),
            Pluto: TextureGenerator.createPlutoTexture(),
            Haumea: TextureGenerator.createHaumeaTexture(),
            Makemake: TextureGenerator.createMakemakeTexture(),
            Eris: TextureGenerator.createErisTexture()
        };

        const earthNightTexture = TextureGenerator.createEarthNightTexture();

        for (const p of PLANETS) {
            const geo = new THREE.SphereGeometry(p.radius, 64, 64);
            let mat;
            let mesh;

            if (p.isStar) {
                // SUN - God-like, overpowering
                mat = new THREE.MeshBasicMaterial({ map: textureMap[p.name] });
                mesh = new THREE.Mesh(geo, mat);

                // Multi-layer intense glow (reduced size to prevent planet overlap)
                const glowColors = [0xffffee, 0xffcc44, 0xff8800, 0xff4400, 0xff2200];
                for (let i = 1; i <= 5; i++) {
                    const glowGeo = new THREE.SphereGeometry(p.radius * (1 + i * 0.1), 48, 48); // Reduced from 0.25 to 0.1
                    const glowMat = new THREE.MeshBasicMaterial({
                        color: glowColors[i - 1],
                        transparent: true,
                        opacity: 0.15 / (i * 0.7),
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    const glow = new THREE.Mesh(glowGeo, glowMat);
                    mesh.add(glow);
                    this.glowMeshes.push(glow);
                }

                // Corona effect - outer halo (reduced size)
                const coronaGeo = new THREE.SphereGeometry(p.radius * 1.8, 32, 32); // Reduced from 3 to 1.8
                const coronaMat = new THREE.MeshBasicMaterial({
                    color: 0xffaa00,
                    transparent: true,
                    opacity: 0.04,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                mesh.add(new THREE.Mesh(coronaGeo, coronaMat));

            } else if (p.isDwarf) {
                // DWARF PLANETS - Icy, ethereal glow
                mat = new THREE.MeshStandardMaterial({
                    map: textureMap[p.name],
                    roughness: 0.7,
                    metalness: 0.1,
                    emissive: new THREE.Color(0x222233),
                    emissiveIntensity: 0.1
                });
                mesh = new THREE.Mesh(geo, mat);

                // Icy glow for Kuiper Belt objects
                let glowColor = 0x88aacc;
                if (p.name === 'Pluto') glowColor = 0xccaa99;
                else if (p.name === 'Eris') glowColor = 0xaabbcc;
                else if (p.name === 'Makemake') glowColor = 0xccaa88;
                else if (p.name === 'Ceres') glowColor = 0x999999;

                const atmo = this.createAtmosphere(p.radius, glowColor, 0.3, 1.15);
                mesh.add(atmo);
                this.atmosphereMeshes.push(atmo);

            } else {
                // PLANETS
                mat = new THREE.MeshStandardMaterial({
                    map: textureMap[p.name],
                    roughness: p.name === 'Mars' ? 0.95 : 0.85,
                    metalness: 0.02
                });
                mesh = new THREE.Mesh(geo, mat);

                // Add atmosphere/rim glow based on planet
                let atmoColor, atmoOpacity, atmoScale;

                switch (p.name) {
                    case 'Venus':
                        atmoColor = 0xffddaa;
                        atmoOpacity = 0.5;
                        atmoScale = 1.12;
                        break;
                    case 'Earth':
                        atmoColor = 0x88ccff;
                        atmoOpacity = 0.45;
                        atmoScale = 1.08;
                        // Add night lights layer
                        const nightMat = new THREE.MeshBasicMaterial({
                            map: earthNightTexture,
                            transparent: true,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false
                        });
                        const nightMesh = new THREE.Mesh(
                            new THREE.SphereGeometry(p.radius * 1.001, 64, 64),
                            nightMat
                        );
                        mesh.add(nightMesh);
                        break;
                    case 'Mars':
                        atmoColor = 0xffaa88;
                        atmoOpacity = 0.2;
                        atmoScale = 1.04;
                        break;
                    case 'Jupiter':
                        atmoColor = 0xffddcc;
                        atmoOpacity = 0.25;
                        atmoScale = 1.05;
                        break;
                    case 'Saturn':
                        atmoColor = 0xffeedd;
                        atmoOpacity = 0.2;
                        atmoScale = 1.04;
                        break;
                    case 'Uranus':
                        atmoColor = 0xaaffff;
                        atmoOpacity = 0.4;
                        atmoScale = 1.06;
                        break;
                    case 'Neptune':
                        atmoColor = 0x6688ff;
                        atmoOpacity = 0.35;
                        atmoScale = 1.06;
                        break;
                    default:
                        atmoColor = null;
                }

                if (atmoColor) {
                    const atmo = this.createAtmosphere(p.radius, atmoColor, atmoOpacity, atmoScale);
                    mesh.add(atmo);
                    this.atmosphereMeshes.push(atmo);
                }
            }

            mesh.name = p.name;
            // Initialize with mean anomaly (random starting position)
            const meanAnomaly = Math.random() * Math.PI * 2;
            mesh.userData = {
                ...p,
                meanAnomaly: meanAnomaly,
                // Default values for planets without orbital data
                eccentricity: p.eccentricity || 0,
                inclination: p.inclination || 0,
                argPerihelion: p.argPerihelion || 0,
                axialTilt: p.axialTilt || 0,
                rotationPeriod: p.rotationPeriod || 24,
                moonMeshes: []
            };

            // Apply axial tilt (rotate around Z axis to tilt the rotation axis)
            if (p.axialTilt) {
                const tiltRad = (p.axialTilt * Math.PI) / 180;
                mesh.rotation.z = tiltRad;
            }

            if (p.orbitRadius > 0) {
                // Calculate initial position using orbital mechanics
                const pos = OrbitalMechanics.calculatePosition(
                    meanAnomaly,
                    p.orbitRadius,
                    p.eccentricity || 0,
                    p.inclination || 0,
                    p.argPerihelion || 0
                );
                mesh.position.copy(pos);
            }

            if (p.hasRings) {
                this.createRings(mesh, p);
            }

            // Create moons
            if (p.moons && p.moons.length > 0) {
                this.createMoons(mesh, p);
            }

            this.scene.add(mesh);
            this.bodies[p.name] = mesh;
            this.meshes.push(mesh);
        }
    }

    createMoons(planet, data) {
        // Create a separate container for moons that follows planet position but not rotation
        const moonSystem = new THREE.Group();
        moonSystem.userData = {
            parentPlanet: data.name,
            moons: []
        };
        this.scene.add(moonSystem);
        this.moonSystems[data.name] = moonSystem;

        // Shared orbit line material for performance
        const orbitMat = new THREE.LineBasicMaterial({
            color: 0x666688,
            transparent: true,
            opacity: 0.3
        });

        const moons = data.moons;
        for (let i = 0, len = moons.length; i < len; i++) {
            const moon = moons[i];
            // Dynamic geometry resolution based on moon size (performance optimization)
            const segments = moon.radius > 0.5 ? 32 : moon.radius > 0.1 ? 16 : 8;
            const moonGeo = new THREE.SphereGeometry(moon.radius, segments, segments);
            const moonMat = new THREE.MeshStandardMaterial({
                color: moon.color,
                roughness: 0.8,
                metalness: 0.1
            });
            const moonMesh = new THREE.Mesh(moonGeo, moonMat);

            // Random starting position
            const startAngle = Math.random() * TWO_PI;
            const orbitRadius = moon.orbitRadius;
            moonMesh.position.x = Math.cos(startAngle) * orbitRadius;
            moonMesh.position.z = Math.sin(startAngle) * orbitRadius;

            moonMesh.userData = {
                name: moon.name,
                orbitRadius: orbitRadius,
                period: moon.period,
                angle: startAngle,
                parentPlanet: data.name,
                isMoon: true
            };

            // Add orbit line for moon (fewer segments for small moons)
            const orbitSegments = 48;
            const orbitPoints = new Array(orbitSegments + 1);
            const angleStep = TWO_PI / orbitSegments;
            for (let j = 0; j <= orbitSegments; j++) {
                const angle = j * angleStep;
                orbitPoints[j] = new THREE.Vector3(
                    Math.cos(angle) * orbitRadius,
                    0,
                    Math.sin(angle) * orbitRadius
                );
            }
            const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
            const orbitLine = new THREE.Line(orbitGeo, orbitMat);
            moonSystem.add(orbitLine);

            moonSystem.add(moonMesh);
            moonSystem.userData.moons.push(moonMesh);
            this.allMoons.push(moonMesh);
        }
    }

    createRings(planet, data) {
        const innerRadius = data.radius * 1.3;
        const outerRadius = data.radius * 2.5;

        const geo = new THREE.RingGeometry(innerRadius, outerRadius, 128);
        const pos = geo.attributes.position;
        const uv = geo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const dist = Math.sqrt(x * x + y * y);
            uv.setXY(i, (dist - innerRadius) / (outerRadius - innerRadius), 0.5);
        }

        const mat = new THREE.MeshBasicMaterial({
            map: TextureGenerator.createRingTexture(),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            blending: THREE.NormalBlending,
            depthWrite: false
        });

        const ring = new THREE.Mesh(geo, mat);
        // Ring lies in planet's equatorial plane, so just rotate to horizontal
        // The planet's axial tilt will tilt the ring with it
        ring.rotation.x = Math.PI / 2;

        planet.add(ring);
        planet.userData.ring = ring;
    }

    createAsteroidBelt() {
        // Asteroid Belt: 2.1 to 3.3 AU (between Mars at 1.52 AU and Jupiter at 5.20 AU)
        // Aligned with average orbital plane of inner planets (~2-3° inclination)
        const asteroidCount = 2500;
        const innerRadius = AU * 2.1 * DISTANCE_COMPRESSION + ORBIT_OFFSET;  // 2.1 AU (compressed + offset)
        const outerRadius = AU * 3.3 * DISTANCE_COMPRESSION + ORBIT_OFFSET;  // 3.3 AU (compressed + offset)
        const beltInclination = 2.5; // Average inclination in degrees to align with inner planets
        const incRad = (beltInclination * Math.PI) / 180;

        const positions = new Float32Array(asteroidCount * 3);
        const colors = new Float32Array(asteroidCount * 3);
        const sizes = new Float32Array(asteroidCount);

        for (let i = 0; i < asteroidCount; i++) {
            const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
            const angle = Math.random() * Math.PI * 2;
            const height = (Math.random() - 0.5) * AU * 0.15; // Slight vertical thickness

            // Position in orbital plane
            const xOrbital = Math.cos(angle) * radius;
            const yOrbital = height;
            const zOrbital = Math.sin(angle) * radius;

            // Apply inclination rotation (rotate around X axis)
            positions[i * 3] = xOrbital;
            positions[i * 3 + 1] = yOrbital * Math.cos(incRad) - zOrbital * Math.sin(incRad);
            positions[i * 3 + 2] = yOrbital * Math.sin(incRad) + zOrbital * Math.cos(incRad);

            // Rocky grey-brown colors
            const shade = 0.4 + Math.random() * 0.3;
            colors[i * 3] = shade + 0.05;
            colors[i * 3 + 1] = shade;
            colors[i * 3 + 2] = shade - 0.05;

            sizes[i] = Math.random() * 1.5 + 0.3;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 2.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.asteroidBelt = new THREE.Points(geometry, material);
        this.asteroidBelt.userData = { speeds: [] };

        // Store individual speeds for animation
        for (let i = 0; i < asteroidCount; i++) {
            this.asteroidBelt.userData.speeds.push(0.0001 + Math.random() * 0.0002);
        }

        this.scene.add(this.asteroidBelt);
    }

    createKuiperBelt() {
        // Kuiper Belt: 30 AU to 55 AU (starts at Neptune's orbit)
        // Aligned with average orbital plane of outer planets (~1-2° inclination)
        const particleCount = 4000;
        const innerRadius = AU * 30 * DISTANCE_COMPRESSION + ORBIT_OFFSET;   // 30 AU (Neptune's orbit, compressed + offset)
        const outerRadius = AU * 55 * DISTANCE_COMPRESSION + ORBIT_OFFSET;   // 55 AU (classical Kuiper Belt edge, compressed + offset)
        const beltInclination = 1.5; // Average inclination in degrees to align with outer planets
        const incRad = (beltInclination * Math.PI) / 180;

        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
            const angle = Math.random() * Math.PI * 2;
            const height = (Math.random() - 0.5) * AU * 0.4; // Wider vertical spread than asteroid belt

            // Position in orbital plane
            const xOrbital = Math.cos(angle) * radius;
            const yOrbital = height;
            const zOrbital = Math.sin(angle) * radius;

            // Apply inclination rotation (rotate around X axis)
            positions[i * 3] = xOrbital;
            positions[i * 3 + 1] = yOrbital * Math.cos(incRad) - zOrbital * Math.sin(incRad);
            positions[i * 3 + 2] = yOrbital * Math.sin(incRad) + zOrbital * Math.cos(incRad);

            // Icy blue-white colors
            const shade = 0.5 + Math.random() * 0.4;
            colors[i * 3] = shade * 0.8;
            colors[i * 3 + 1] = shade * 0.9;
            colors[i * 3 + 2] = shade;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.kuiperBelt = new THREE.Points(geometry, material);
        this.scene.add(this.kuiperBelt);

        // Add outer glow ring for Kuiper Belt (aligned with belt inclination)
        const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 128);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x4466aa,
            transparent: true,
            opacity: 0.03,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const kuiperRing = new THREE.Mesh(ringGeo, ringMat);
        kuiperRing.rotation.x = Math.PI / 2 + incRad; // Apply inclination to ring
        this.scene.add(kuiperRing);
    }

    createOrbits() {
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x4466aa,
            transparent: true,
            opacity: 0.3
        });

        for (let i = 0, len = PLANETS.length; i < len; i++) {
            const p = PLANETS[i];
            if (p.orbitRadius === 0) continue;

            const points = [];
            const eccentricity = p.eccentricity || 0;
            const inclination = p.inclination || 0;
            const argPerihelion = p.argPerihelion || 0;
            const segments = 256;
            const angleStep = TWO_PI / segments;

            // Generate points along elliptical orbit
            for (let j = 0; j <= segments; j++) {
                const meanAnomaly = j * angleStep;
                points.push(OrbitalMechanics.calculatePosition(
                    meanAnomaly,
                    p.orbitRadius,
                    eccentricity,
                    inclination,
                    argPerihelion
                ));
            }

            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geo, orbitMaterial.clone());
            this.scene.add(line);
            this.orbitLines.push(line);
        }
    }

    setupUI() {
        document.getElementById('speed-slider')?.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value) / 100;
            document.getElementById('speed-value').textContent = e.target.value + '%';
        });

        document.getElementById('show-orbits')?.addEventListener('change', (e) => {
            this.showOrbits = e.target.checked;
            this.orbitLines.forEach(l => l.visible = this.showOrbits);
        });

        document.getElementById('show-labels')?.addEventListener('change', (e) => {
            this.showLabels = e.target.checked;
        });

        document.querySelectorAll('.planet-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectPlanet(btn.dataset.planet));
        });

        document.getElementById('close-panel')?.addEventListener('click', () => {
            document.getElementById('info-panel').classList.add('hidden');
        });

        document.getElementById('exit-focus')?.addEventListener('click', () => this.exitFocus());

        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setView(btn.dataset.view));
        });
    }

    setView(viewName) {
        if (viewName === this.currentView || !VIEWS[viewName]) return;

        if (this.state !== STATE.IDLE) {
            this.exitFocus();
        }

        this.currentView = viewName;
        this.viewTransition = true;
        this.viewTransitionStart = this.clock.getElapsedTime();

        this.viewStartPos.copy(this.camera.position);
        this.viewStartTarget.copy(this.controls.target);

        this.viewEndPos.copy(VIEWS[viewName].position);
        this.viewEndTarget.copy(VIEWS[viewName].target);

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
    }

    setupEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            // Check for moon hover
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const moonHits = this.raycaster.intersectObjects(this.allMoons);
            if (moonHits.length > 0) {
                this.hoveredMoon = moonHits[0].object;
            } else {
                this.hoveredMoon = null;
            }
        });

        this.renderer.domElement.addEventListener('click', () => {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const hits = this.raycaster.intersectObjects(this.meshes);
            if (hits.length > 0) this.selectPlanet(hits[0].object.name);
        });
    }

    selectPlanet(name) {
        const body = this.bodies[name];
        if (!body) return;

        this.target = body;

        document.querySelectorAll('.planet-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.planet === name);
        });

        const d = body.userData;
        const dom = this._domCache;
        dom.planetName.textContent = d.name;
        dom.statPeriod.textContent = d.period ? d.period.toLocaleString() + ' days' : '—';
        dom.statDistance.textContent = d.distance || '—';
        dom.statDiameter.textContent = d.diameter || '—';
        dom.statMass.textContent = d.mass || '—';
        dom.statGravity.textContent = d.gravity || '—';
        dom.statTemperature.textContent = d.temperature || '—';
        dom.statDay.textContent = d.dayLength || '—';
        dom.statMoons.textContent = d.moonCount || '—';
        dom.infoAtmosphere.textContent = d.atmosphere;
        dom.infoEnvironment.textContent = d.environment;

        dom.infoPanel.classList.remove('hidden');
        dom.exitFocus.classList.remove('hidden');

        this.state = STATE.CHASE;
        this.chaseStart = this.clock.getElapsedTime();
        this.startCamPos.copy(this.camera.position);
        this.startTarget.copy(this.controls.target);
    }

    exitFocus() {
        this.state = STATE.IDLE;
        this.target = null;
        this.controls.target.set(0, 0, 0);
        this._domCache.exitFocus.classList.add('hidden');
        document.querySelectorAll('.planet-btn').forEach(btn => btn.classList.remove('active'));
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();
        const speed = this.speed; // Cache for loop

        // Update planets with realistic orbital mechanics
        for (let i = 0, len = PLANETS.length; i < len; i++) {
            const p = PLANETS[i];
            const mesh = this.bodies[p.name];
            const data = mesh.userData;

            // Update orbital position (skip for Sun)
            if (p.orbitRadius > 0) {
                // Calculate mean motion (angular speed) - accounts for Kepler's laws
                const meanMotion = OrbitalMechanics.calculateMeanMotion(data.period, speed);

                // Update mean anomaly (increases linearly, but speed varies due to eccentricity)
                data.meanAnomaly += meanMotion * delta;

                // Keep mean anomaly in [0, 2π] range
                data.meanAnomaly = ((data.meanAnomaly % TWO_PI) + TWO_PI) % TWO_PI;

                // Calculate new position using elliptical orbit mechanics
                const pos = OrbitalMechanics.calculatePosition(
                    data.meanAnomaly,
                    data.orbitRadius,
                    data.eccentricity,
                    data.inclination,
                    data.argPerihelion
                );
                mesh.position.copy(pos);
            }

            // Rotate planet on its axis based on rotation period
            const rotationPeriod = data.rotationPeriod || 24;
            const rotationSpeed = (TWO_PI / Math.abs(rotationPeriod)) * 0.1 * speed;
            const rotationDirection = rotationPeriod > 0 ? 1 : -1;

            // Apply rotation using reusable objects
            const tiltRad = (data.axialTilt || 0) * DEG_TO_RAD;
            this._rotAxis.set(Math.sin(tiltRad), Math.cos(tiltRad), 0).normalize();
            this._tempQuat.setFromAxisAngle(this._rotAxis, rotationSpeed * rotationDirection * delta);
            mesh.quaternion.multiplyQuaternions(this._tempQuat, mesh.quaternion);
        }

        // Animate moon systems (separate from planet rotation)
        for (const planetName in this.moonSystems) {
            const moonSystem = this.moonSystems[planetName];
            const parentPlanet = this.bodies[planetName];

            // Moon system follows planet position but not rotation
            moonSystem.position.copy(parentPlanet.position);

            // Animate each moon in the system
            const moons = moonSystem.userData.moons;
            for (let j = 0, mLen = moons.length; j < mLen; j++) {
                const moonMesh = moons[j];
                const moonData = moonMesh.userData;
                // Moon orbital speed: ~10 seconds per orbit at 1x speed
                moonData.angle += 0.01 * speed;

                const angle = moonData.angle;
                const radius = moonData.orbitRadius;
                moonMesh.position.x = Math.cos(angle) * radius;
                moonMesh.position.z = Math.sin(angle) * radius;

                // Moon self-rotation (tidally locked)
                moonMesh.rotation.y = -angle;
            }
        }

        // Animate Sun glow
        if (this.bodies.Sun) {

            // Pulsing glow
            const pulse = Math.sin(elapsed * 0.5) * 0.02 + 1;
            this.glowMeshes.forEach((glow, i) => {
                glow.scale.setScalar(pulse + i * 0.01);
            });
        }

        // Animate asteroid belt (slow rotation)
        if (this.asteroidBelt) {
            this.asteroidBelt.rotation.y += 0.00005 * this.speed;
        }

        // Animate Kuiper belt (very slow rotation)
        if (this.kuiperBelt) {
            this.kuiperBelt.rotation.y += 0.00002 * this.speed;
        }

        // View transition
        if (this.viewTransition) {
            const transElapsed = this.clock.getElapsedTime() - this.viewTransitionStart;
            const duration = 1.5;
            let t = Math.min(transElapsed / duration, 1);
            t = 1 - Math.pow(1 - t, 3);

            this.camera.position.lerpVectors(this.viewStartPos, this.viewEndPos, t);
            this.controls.target.lerpVectors(this.viewStartTarget, this.viewEndTarget, t);

            if (t >= 1) {
                this.viewTransition = false;
            }
        }

        // State machine
        if (this.state === STATE.CHASE && this.target) {
            const chaseElapsed = this.clock.getElapsedTime() - this.chaseStart;
            let t = Math.min(chaseElapsed / 1.5, 1);
            t = 1 - Math.pow(1 - t, 3);

            const pos = this.target.position.clone();
            const r = this.target.userData.radius;
            // Minimum offset to prevent camera being too close to Sun for inner planets
            const minOffset = this.target.userData.zone === 'inner' || this.target.userData.isDwarf ? 25 : 10;
            const offsetScale = Math.max(r * 3, minOffset);
            const offset = new THREE.Vector3(offsetScale, offsetScale * 0.5, offsetScale);
            const camTarget = pos.clone().add(offset);

            this.camera.position.lerpVectors(this.startCamPos, camTarget, t);
            this.controls.target.lerpVectors(this.startTarget, pos, t);

            if (t >= 1) this.state = STATE.LOCKED;
        } else if (this.state === STATE.LOCKED && this.target) {
            this.controls.target.copy(this.target.position);
        }

        this.controls.update();
        this.updateLabels();
        this.renderer.render(this.scene, this.camera);
    }

    _getLabel(index, className) {
        // Reuse existing label or create new one
        if (index < this._labelPool.length) {
            const label = this._labelPool[index];
            label.style.display = '';
            return label;
        }
        const label = document.createElement('div');
        document.body.appendChild(label);
        this._labelPool.push(label);
        return label;
    }

    updateLabels() {
        let labelIndex = 0;

        // Hide all labels first if not showing
        if (!this.showLabels) {
            for (let i = 0; i < this._activeLabelCount; i++) {
                this._labelPool[i].style.display = 'none';
            }
            this._activeLabelCount = 0;
            return;
        }

        // Cache window dimensions
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const halfWidth = winWidth * 0.5;
        const halfHeight = winHeight * 0.5;

        // Planet labels
        for (let i = 0, len = PLANETS.length; i < len; i++) {
            const p = PLANETS[i];
            if (p.isStar) continue;

            const mesh = this.bodies[p.name];
            this._tempVec3.copy(mesh.position);
            this._tempVec3.y += mesh.userData.radius + 6;
            this._tempVec3.project(this.camera);

            if (this._tempVec3.z > 1) continue;

            const x = (this._tempVec3.x + 1) * halfWidth;
            const y = (1 - this._tempVec3.y) * halfHeight;

            const label = this._getLabel(labelIndex++, 'planet-label');
            label.className = 'planet-label';
            label.innerHTML = `<span class="label-text">${p.name}</span><span class="label-line"></span>`;
            label.style.left = x + 'px';
            label.style.top = y + 'px';
        }

        // Moon label (only on hover)
        if (this.hoveredMoon) {
            const moonData = this.hoveredMoon.userData;
            this.hoveredMoon.getWorldPosition(this._tempVec3);
            this._tempVec3.y += moonData.orbitRadius * 0.3 + 1;
            this._tempVec3.project(this.camera);

            if (this._tempVec3.z <= 1) {
                const x = (this._tempVec3.x + 1) * halfWidth;
                const y = (1 - this._tempVec3.y) * halfHeight;

                const label = this._getLabel(labelIndex++, 'moon-label');
                label.className = 'moon-label';
                label.innerHTML = `<span class="label-text">${moonData.name}</span><span class="label-sub">${moonData.parentPlanet}</span>`;
                label.style.left = x + 'px';
                label.style.top = y + 'px';
            }
        }

        // Hide unused labels from pool
        for (let i = labelIndex; i < this._activeLabelCount; i++) {
            this._labelPool[i].style.display = 'none';
        }
        this._activeLabelCount = labelIndex;
    }
}

// Initialize
console.log('Initializing Mythic Solar System...');
new SolarSystem();
