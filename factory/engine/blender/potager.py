# Décor 3D (Blender / bpy, Cycles CPU) pour « 4 graines, 1 récolte » : coupe de terrain d'un potager au lever du jour.
# Caméra orthographique (1 m = 100 px logiques). Repère de la plaque : 1080 × 2880 px ; x_px = 540 + 100·x ; y_px = 900 − 100·z
# (surface z = 0 → 900 px). Le moteur canvas dessine par-dessus : graines, racines qui poussent, fleurs en plastique,
# arrosoirs, pluie, personnages.
# Usage : python potager.py -- <dossier_sortie> [échelle (1.5)] [échantillons (40)]
import bpy, math, random, json, sys, os, time

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else '/tmp/potager'
SCALE = float(args[1]) if len(args) > 1 else 1.5
SAMPLES = int(args[2]) if len(args) > 2 else 40
os.makedirs(OUT, exist_ok=True)
random.seed(21)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

W_M, H_M, TOP_Z = 10.8, 28.8, 9.0
COLS = {'ego': -3.9, 'obsession': -1.3, 'chance': 1.3, 'discipline': 3.9}

def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; return m, m.node_tree

def mat(name, color, rough=0.8, metal=0.0, emit=0.0):
    mm = bpy.data.materials.new(name); mm.use_nodes = True; b = mm.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    return mm

# ---------------------------------------------------------------- strates du sol (humus, terre brune, argile, roche), bords ondulés
m, nt = node_mat('strates'); N = nt.nodes; L = nt.links
bsdf = N['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.95
geo = N.new('ShaderNodeNewGeometry'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.45; nz.inputs['Detail'].default_value = 4; L.new(geo.outputs['Position'], nz.inputs['Vector'])
mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY_ADD'; mul.inputs[1].default_value = 0.9; mul.inputs[2].default_value = -0.45; L.new(nz.outputs['Fac'], mul.inputs[0])
add = N.new('ShaderNodeMath'); add.operation = 'ADD'; L.new(sep.outputs['Z'], add.inputs[0]); L.new(mul.outputs[0], add.inputs[1])
mapr = N.new('ShaderNodeMapRange'); mapr.inputs['From Min'].default_value = -20; mapr.inputs['From Max'].default_value = 0; L.new(add.outputs[0], mapr.inputs['Value'])
ramp = N.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
strata = [(0.0, (0.05, 0.05, 0.07)), (0.40, (0.16, 0.15, 0.15)), (0.55, (0.34, 0.20, 0.10)), (0.72, (0.22, 0.12, 0.06)), (0.88, (0.13, 0.07, 0.035)), (0.97, (0.05, 0.03, 0.02))]
cr.elements[0].position, cr.elements[0].color = strata[0][0], (*strata[0][1], 1)
cr.elements[1].position, cr.elements[1].color = strata[1][0], (*strata[1][1], 1)
for p, c in strata[2:]:
    e = cr.elements.new(p); e.color = (*c, 1)
L.new(mapr.outputs['Result'], ramp.inputs['Fac'])
nz2 = N.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 3.5; nz2.inputs['Detail'].default_value = 8; L.new(geo.outputs['Position'], nz2.inputs['Vector'])
mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 0.5
L.new(ramp.outputs['Color'], mix.inputs['A']); L.new(nz2.outputs['Color'], mix.inputs['B']); L.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.4; L.new(nz2.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 4, -12)); earth = bpy.context.object; earth.scale = (16, 8, 24); earth.data.materials.append(m)

# ---------------------------------------------------------------- dans la terre : cailloux, vers de terre, racines de fond
rockm = [mat('roc1', (0.22, 0.2, 0.18), 0.7), mat('roc2', (0.34, 0.3, 0.26), 0.75), mat('roc3', (0.14, 0.14, 0.15), 0.6)]
for i in range(110):
    z = -random.uniform(0.5, 19); x = random.uniform(-5.6, 5.6)
    if any(abs(x - cx) < 0.7 for cx in COLS.values()) and z > -5: continue
    r = random.uniform(0.05, 0.16) * (1 + (-z) / 10)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, random.uniform(-0.08, 0.05), z))
    o = bpy.context.object; o.scale = (random.uniform(0.8, 1.5), 0.7, random.uniform(0.6, 1.0)); o.rotation_euler = (random.random(), random.random(), random.random()); o.data.materials.append(random.choice(rockm))
wormm = mat('ver', (0.82, 0.46, 0.46), 0.5)
for i in range(10):
    x = random.uniform(-5.4, 5.4); z = -random.uniform(0.25, 1.6)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.028, depth=random.uniform(0.2, 0.34), location=(x, -0.07, z))
    o = bpy.context.object; o.rotation_euler = (math.radians(90), random.uniform(0, 3), random.uniform(-0.5, 0.5)); o.data.materials.append(wormm)
rootm = mat('racine', (0.45, 0.32, 0.2), 0.8)
for i in range(30):
    x = random.uniform(-5.4, 5.4); z0 = -0.12
    for k in range(5):
        z1 = z0 - random.uniform(0.12, 0.34); x1 = x + random.uniform(-0.22, 0.22)
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.02 * (1 - k * 0.15), depth=math.dist((x, z0), (x1, z1)), location=((x + x1) / 2, -0.03, (z0 + z1) / 2))
        o = bpy.context.object; o.rotation_euler = (0, math.atan2(x1 - x, z0 - z1), 0); o.data.materials.append(rootm)
        x, z0 = x1, z1

# ---------------------------------------------------------------- surface : herbe, quatre buttes de terre, clôture, tournesols, arbres
grass = mat('herbe', (0.10, 0.30, 0.07), 0.7)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 4, 0.04)); g = bpy.context.object; g.scale = (16, 8, 0.08); g.data.materials.append(grass)
for i in range(900):
    x = random.uniform(-6, 6); y = random.uniform(-0.05, 3.5)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.02, depth=random.uniform(0.1, 0.3), location=(x, y, 0.1))
    o = bpy.context.object; o.rotation_euler = (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), 0); o.data.materials.append(grass)
humus = mat('humus', (0.07, 0.04, 0.025), 0.95)
for cx in COLS.values():
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(cx, 0, 0)); o = bpy.context.object; o.scale = (1.15, 0.9, 0.16); o.data.materials.append(humus); bpy.ops.object.shade_smooth()
wood = mat('bois', (0.22, 0.13, 0.07), 0.8)
for x in [i * 1.5 - 7.5 for i in range(11)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 2.0, 0.6)); o = bpy.context.object; o.scale = (0.12, 0.1, 1.2); o.data.materials.append(wood)
for z in (0.45, 0.9):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 2.0, z)); o = bpy.context.object; o.scale = (16, 0.07, 0.1); o.data.materials.append(wood)
stem = mat('tige', (0.1, 0.28, 0.07), 0.7); petal = mat('petale', (1.0, 0.72, 0.1), 0.5, emit=0.35); core = mat('coeur', (0.2, 0.1, 0.04), 0.9)
for x, y, h in [(-5.0, 3.2, 2.4), (-2.6, 3.8, 2.0), (0.4, 3.4, 2.6), (2.8, 4.0, 2.2), (5.0, 3.3, 2.5)]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.05, depth=h, location=(x, y, h / 2)); bpy.context.object.data.materials.append(stem)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.42, depth=0.06, location=(x, y - 0.06, h), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(petal)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.2, depth=0.1, location=(x, y - 0.1, h), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(core)
trunk = mat('tronc', (0.08, 0.05, 0.03)); leaf = [mat('feuille1', (0.06, 0.18, 0.06)), mat('feuille2', (0.1, 0.24, 0.08))]
for x, y, h in [(-5.4, 7, 3.0), (-0.3, 9, 3.6), (5.6, 8, 2.8), (2.8, 12, 4.0), (-3.4, 13, 3.4)]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.14, depth=h, location=(x, y, h / 2)); bpy.context.object.data.materials.append(trunk)
    for k in range(3):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=random.uniform(0.8, 1.2), location=(x + random.uniform(-0.4, 0.4), y, h + random.uniform(-0.2, 0.5))); bpy.context.object.data.materials.append(random.choice(leaf))
hill = mat('colline', (0.05, 0.12, 0.07), 0.9)
for x, y, r in [(-6, 30, 9), (4, 34, 12), (12, 28, 8), (-14, 36, 11)]:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, -r * 0.6)); bpy.context.object.data.materials.append(hill)

# ---------------------------------------------------------------- ciel du lever du jour (dégradé émissif)
sm, snt = node_mat('ciel'); sn = snt.nodes; sl = snt.links; sn.remove(sn['Principled BSDF'])
em = sn.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.3
sgeo = sn.new('ShaderNodeNewGeometry'); ssep = sn.new('ShaderNodeSeparateXYZ'); sl.new(sgeo.outputs['Position'], ssep.inputs[0])
smr = sn.new('ShaderNodeMapRange'); smr.inputs['From Min'].default_value = 0.0; smr.inputs['From Max'].default_value = 10.0; sl.new(ssep.outputs['Z'], smr.inputs['Value'])
rn = sn.new('ShaderNodeValToRGB'); sr = rn.color_ramp
sr.elements[0].position, sr.elements[0].color = 0.0, (1.0, 0.62, 0.30, 1)
sr.elements[1].position, sr.elements[1].color = 1.0, (0.16, 0.36, 0.78, 1)
e = sr.elements.new(0.3); e.color = (0.95, 0.55, 0.5, 1)
e = sr.elements.new(0.6); e.color = (0.45, 0.5, 0.82, 1)
sl.new(smr.outputs['Result'], rn.inputs['Fac']); sl.new(rn.outputs['Color'], em.inputs['Color']); sl.new(em.outputs[0], sn['Material Output'].inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 60, 8), rotation=(math.radians(90), 0, 0)); sky = bpy.context.object; sky.scale = (120, 30, 1); sky.data.materials.append(sm)
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; wd.node_tree.nodes['Background'].inputs['Color'].default_value = (0.08, 0.1, 0.16, 1)

# ---------------------------------------------------------------- lumière : soleil bas et chaud, appoint sur la coupe
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(76), 0, math.radians(-140))); s = bpy.context.object.data; s.energy = 3.4; s.color = (1.0, 0.72, 0.45); s.angle = 0.03
bpy.ops.object.light_add(type='AREA', location=(0, -9, 1.5), rotation=(math.radians(80), 0, 0)); A = bpy.context.object.data; A.energy = 2600; A.size = 14; A.color = (0.95, 0.88, 0.8)
bpy.ops.object.light_add(type='AREA', location=(0, -7, -6), rotation=(math.radians(90), 0, 0)); A2 = bpy.context.object.data; A2.energy = 800; A2.size = 12; A2.color = (0.8, 0.7, 0.6)

cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.ortho_scale = W_M
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
co.location = (0, -30, TOP_Z - H_M / 2); co.rotation_euler = (math.radians(90), 0, 0); sc.camera = co
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.max_bounces = 6
sc.render.resolution_x = int(1080 * SCALE); sc.render.resolution_y = int(2880 * SCALE); sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'; sc.view_settings.exposure = 0.15
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90
sc.render.filepath = os.path.join(OUT, 'coupe.jpg')
t0 = time.time(); bpy.ops.render.render(write_still=True); print('PLAQUE coupe', round(time.time() - t0, 1), 's', flush=True)
json.dump({'coupe': {'w': 1080, 'h': 2880, 'ppm': 100, 'surface': 900, 'cols': {k: 540 + 100 * v for k, v in COLS.items()}}}, open(os.path.join(OUT, 'anchors.json'), 'w'), indent=1)
