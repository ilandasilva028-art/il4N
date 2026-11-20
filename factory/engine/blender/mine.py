# Décor 3D (Blender / bpy, Cycles CPU) pour « 4 mineurs, 1 seul diamant » : coupe de terrain vue de face,
# caméra orthographique (1 m = 100 px logiques). Ciel de crépuscule, herbe, arbres ; sous terre : strates
# (terre, argile, grès, roche grise, basalte), cailloux, cristaux, et deux diamants enfouis.
# Le moteur canvas creuse les puits par-dessus, pose les personnages et les échelles.
# Repère logique de la plaque : 1080 × 2880 px ; x_px = 540 + 100·x ; y_px = 900 − 100·z (surface z = 0 → 900 px).
# Usage : python mine.py -- <dossier_sortie> [échelle (1.5)] [échantillons (40)]
import bpy, math, random, json, sys, os, time
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else '/tmp/mine'
SCALE = float(args[1]) if len(args) > 1 else 1.5
SAMPLES = int(args[2]) if len(args) > 2 else 40
os.makedirs(OUT, exist_ok=True)
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

W_M, H_M, TOP_Z = 10.8, 28.8, 9.0          # largeur / hauteur visibles (m), z du haut de l'image
COLS = {'ego': -3.9, 'obsession': -1.3, 'chance': 1.3, 'discipline': 3.9}
DIAMONDS = {'ego': (-3.9, -4.45), 'discipline': (3.9, -11.2)}

def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; return m, m.node_tree

# ---------------------------------------------------------------- strates (couleur selon la profondeur + ondulations)
m, nt = node_mat('strates'); N = nt.nodes; L = nt.links
bsdf = N['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.92
geo = N.new('ShaderNodeNewGeometry'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.35; nz.inputs['Detail'].default_value = 4; L.new(geo.outputs['Position'], nz.inputs['Vector'])
mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY_ADD'; mul.inputs[1].default_value = 0.9; mul.inputs[2].default_value = -0.45
L.new(nz.outputs['Fac'], mul.inputs[0])
add = N.new('ShaderNodeMath'); add.operation = 'ADD'; L.new(sep.outputs['Z'], add.inputs[0]); L.new(mul.outputs[0], add.inputs[1])
mapr = N.new('ShaderNodeMapRange'); mapr.inputs['From Min'].default_value = -20; mapr.inputs['From Max'].default_value = 0
L.new(add.outputs[0], mapr.inputs['Value'])
ramp = N.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
strata = [(0.0, (0.03, 0.03, 0.045)), (0.46, (0.035, 0.035, 0.045)), (0.55, (0.10, 0.10, 0.11)), (0.70, (0.36, 0.17, 0.06)), (0.85, (0.26, 0.15, 0.07)), (0.98, (0.09, 0.05, 0.025))]
cr.elements[0].position, cr.elements[0].color = strata[0][0], (*strata[0][1], 1)
cr.elements[1].position, cr.elements[1].color = strata[1][0], (*strata[1][1], 1)
for p, c in strata[2:]:
    e = cr.elements.new(p); e.color = (*c, 1)
L.new(mapr.outputs['Result'], ramp.inputs['Fac'])
# grain : mélange avec un bruit fin
nz2 = N.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 3.5; nz2.inputs['Detail'].default_value = 8; L.new(geo.outputs['Position'], nz2.inputs['Vector'])
mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 0.45
L.new(ramp.outputs['Color'], mix.inputs['A']); L.new(nz2.outputs['Color'], mix.inputs['B'])
L.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; L.new(nz2.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 4, -12)); earth = bpy.context.object; earth.scale = (16, 8, 24); earth.data.materials.append(m)

def mat(name, color, rough=0.8, metal=0.0, emit=0.0, trans=0.0, ior=1.45):
    mm = bpy.data.materials.new(name); mm.use_nodes = True; b = mm.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    if trans: b.inputs['Transmission Weight'].default_value = trans; b.inputs['IOR'].default_value = ior
    return mm

# ---------------------------------------------------------------- cailloux et blocs enchâssés dans la coupe
rockm = [mat('roc1', (0.18, 0.17, 0.16), 0.7), mat('roc2', (0.3, 0.27, 0.24), 0.75), mat('roc3', (0.12, 0.12, 0.13), 0.6)]
for i in range(140):
    z = -random.uniform(0.6, 19); x = random.uniform(-5.6, 5.6)
    if any(abs(x - cx) < 0.75 for cx in COLS.values()) and z > -12: continue   # laisser les colonnes des puits dégagées
    r = random.uniform(0.06, 0.18) * (1 + (-z) / 10)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, random.uniform(-0.08, 0.05), z))
    o = bpy.context.object; o.scale = (random.uniform(0.8, 1.5), 0.7, random.uniform(0.6, 1.0)); o.rotation_euler = (random.random(), random.random(), random.random())
    o.data.materials.append(random.choice(rockm))
# racines sous l'herbe
rootm = mat('racine', (0.16, 0.09, 0.05), 0.8)
for i in range(26):
    x = random.uniform(-5.4, 5.4); z0 = -0.15
    for k in range(4):
        z1 = z0 - random.uniform(0.15, 0.4); x1 = x + random.uniform(-0.25, 0.25)
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.025 * (1 - k * 0.2), depth=math.dist((x, z0), (x1, z1)), location=((x + x1) / 2, -0.02, (z0 + z1) / 2))
        o = bpy.context.object; o.rotation_euler = (0, math.atan2(x1 - x, z0 - z1), 0); o.data.materials.append(rootm)
        x, z0 = x1, z1
# cristaux (améthystes) dans la roche profonde
amet = mat('amethyste', (0.45, 0.2, 0.75), 0.15, emit=0.6, trans=0.4)
for i in range(18):
    x = random.uniform(-5.4, 5.4); z = -random.uniform(9.5, 18)
    if abs(x - COLS['discipline']) < 0.9: continue
    for k in range(3):
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.07, depth=random.uniform(0.25, 0.45), location=(x + k * 0.07, -0.05, z))
        o = bpy.context.object; o.rotation_euler = (math.radians(90 + random.uniform(-30, 30)), 0, random.uniform(-0.6, 0.6)); o.data.materials.append(amet)
# les deux diamants (octaèdres brillants à moitié dans la paroi)
diam = mat('diamant', (0.75, 0.95, 1.0), 0.02, emit=1.2, trans=0.85, ior=2.4)
for who, (x, z) in DIAMONDS.items():
    s = 0.32 if who == 'discipline' else 0.24
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=s, depth=s * 1.1, location=(x, -0.06, z + s * 0.55)); o = bpy.context.object; o.data.materials.append(diam)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=s, depth=s * 1.6, location=(x, -0.06, z - s * 0.8), rotation=(math.pi, 0, 0)); bpy.context.object.data.materials.append(diam)
    bpy.ops.object.light_add(type='POINT', location=(x, -0.6, z)); P = bpy.context.object.data; P.energy = 12; P.color = (0.6, 0.9, 1.0); P.shadow_soft_size = 0.2

# ---------------------------------------------------------------- surface : herbe, arbres, collines, ciel de crépuscule
grass = mat('herbe', (0.06, 0.16, 0.05), 0.7)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 4, 0.04)); g = bpy.context.object; g.scale = (16, 8, 0.08); g.data.materials.append(grass)
for i in range(700):
    x = random.uniform(-6, 6); y = random.uniform(-0.05, 2.5)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.02, depth=random.uniform(0.1, 0.26), location=(x, y, 0.1))
    o = bpy.context.object; o.rotation_euler = (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), 0); o.data.materials.append(grass)
trunk = mat('tronc', (0.08, 0.05, 0.03)); leaf = [mat('feuille1', (0.05, 0.13, 0.05)), mat('feuille2', (0.08, 0.17, 0.06))]
for x, y, h in [(-5.2, 3.5, 2.6), (-0.1, 6, 3.2), (5.3, 4.2, 2.4), (2.6, 9, 3.6), (-3.2, 10, 3.0)]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.12, depth=h, location=(x, y, h / 2)); bpy.context.object.data.materials.append(trunk)
    for k in range(3):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=random.uniform(0.7, 1.1), location=(x + random.uniform(-0.4, 0.4), y, h + random.uniform(-0.2, 0.5)))
        bpy.context.object.data.materials.append(random.choice(leaf))
hill = mat('colline', (0.025, 0.04, 0.035), 0.9)
for x, y, r in [(-6, 30, 9), (4, 34, 12), (12, 28, 8), (-14, 36, 11)]:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, -r * 0.6)); bpy.context.object.data.materials.append(hill)
# fond de ciel : grand plan émissif en dégradé (bleu nuit → orange à l'horizon)
sm, snt = node_mat('ciel'); sn = snt.nodes; sl = snt.links; sn.remove(sn['Principled BSDF'])
em = sn.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.6
sgeo = sn.new('ShaderNodeNewGeometry'); ssep = sn.new('ShaderNodeSeparateXYZ'); sl.new(sgeo.outputs['Position'], ssep.inputs[0])
smr = sn.new('ShaderNodeMapRange'); smr.inputs['From Min'].default_value = 0.0; smr.inputs['From Max'].default_value = 10.0; sl.new(ssep.outputs['Z'], smr.inputs['Value'])
sr = sn.new('ShaderNodeValToRGB').color_ramp
sr.elements[0].position, sr.elements[0].color = 0.0, (1.0, 0.42, 0.16, 1)
sr.elements[1].position, sr.elements[1].color = 1.0, (0.01, 0.015, 0.05, 1)
e = sr.elements.new(0.22); e.color = (0.55, 0.18, 0.22, 1)
e = sr.elements.new(0.5); e.color = (0.06, 0.05, 0.14, 1)
ramp_node = [n for n in sn if n.bl_idname == 'ShaderNodeValToRGB'][0]
sl.new(smr.outputs['Result'], ramp_node.inputs['Fac']); sl.new(ramp_node.outputs['Color'], em.inputs['Color']); sl.new(em.outputs[0], sn['Material Output'].inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 60, 8), rotation=(math.radians(90), 0, 0)); sky = bpy.context.object; sky.scale = (120, 30, 1); sky.data.materials.append(sm)
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; wd.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.012, 0.03, 1)

# ---------------------------------------------------------------- lumière : soleil couchant rasant + appoint sur la coupe (plus sombre en profondeur)
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(84), 0, math.radians(-150))); s = bpy.context.object.data; s.energy = 3.0; s.color = (1.0, 0.55, 0.3); s.angle = 0.03
bpy.ops.object.light_add(type='AREA', location=(0, -9, 1.5), rotation=(math.radians(80), 0, 0)); A = bpy.context.object.data; A.energy = 2200; A.size = 14; A.color = (0.85, 0.8, 0.75)
bpy.ops.object.light_add(type='AREA', location=(0, -7, -10), rotation=(math.radians(90), 0, 0)); A2 = bpy.context.object.data; A2.energy = 500; A2.size = 12; A2.color = (0.55, 0.6, 0.85)

# ---------------------------------------------------------------- caméra orthographique
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.sensor_fit = 'HORIZONTAL'; cam.ortho_scale = W_M
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
co.location = (0, -30, TOP_Z - H_M / 2); co.rotation_euler = (math.radians(90), 0, 0); sc.camera = co
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.max_bounces = 6
sc.render.resolution_x = int(1080 * SCALE); sc.render.resolution_y = int(2880 * SCALE); sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'; sc.view_settings.exposure = 0.2
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90
sc.render.filepath = os.path.join(OUT, 'coupe.jpg')
t0 = time.time(); bpy.ops.render.render(write_still=True); print('PLAQUE coupe', round(time.time() - t0, 1), 's', flush=True)
json.dump({'coupe': {'w': 1080, 'h': 2880, 'ppm': 100, 'surface': 900, 'cols': {k: 540 + 100 * v for k, v in COLS.items()},
           'diamonds': {k: [540 + 100 * x, 900 - 100 * z] for k, (x, z) in DIAMONDS.items()}}}, open(os.path.join(OUT, 'anchors.json'), 'w'), indent=1)
