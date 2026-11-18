# Essai Blender (bpy) : maison de briques sous l'orage, rendue en Cycles (processeur), pour mesurer qualité et temps.
import bpy, math, random, time, sys
out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/maison.png'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
random.seed(4)
def mat(name, color, emit=0, rough=0.8):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    return m
bricks = [mat(f'brique{i}', c) for i, c in enumerate([(0.32, 0.08, 0.05), (0.38, 0.1, 0.06), (0.27, 0.07, 0.05)])]
mortar = mat('mortier', (0.05, 0.05, 0.055)); roofm = mat('toit', (0.03, 0.03, 0.035), rough=0.5)
ground = mat('sol', (0.02, 0.022, 0.03), rough=0.25); glass = mat('fenetre', (1.0, 0.62, 0.25), emit=12)
door = mat('porte', (0.12, 0.06, 0.03))
# murs : briques individuelles en quinconce (4 façades)
W, D, ROWS, bw, bh, bd = 4.0, 3.0, 14, 0.4, 0.2, 0.2
def brick(x, y, z, rot):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z), rotation=(0, 0, rot))
    o = bpy.context.object; o.scale = (bw * 0.96, bd, bh * 0.92)
    o.data.materials.append(random.choice(bricks))
for r in range(ROWS):
    z = bh / 2 + r * bh; off = (r % 2) * bw / 2
    for side in range(4):
        L = W if side % 2 == 0 else D
        n = int(L / bw)
        for i in range(n):
            u = -L / 2 + off + (i + 0.5) * bw
            if u > L / 2: continue
            # fenêtre et porte sur la façade avant
            if side == 0 and 5 <= r <= 9 and 0.4 < u < 1.4: continue
            if side == 0 and r <= 9 and -0.5 < u < 0.3: continue
            if side == 0: brick(u, -D / 2, z, 0)
            elif side == 2: brick(u, D / 2, z, 0)
            elif side == 1: brick(W / 2, u, z, math.pi / 2)
            else: brick(-W / 2, u, z, math.pi / 2)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, ROWS * bh / 2)); core = bpy.context.object; core.scale = (W - 0.3, D - 0.3, ROWS * bh); core.data.materials.append(mortar)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0.9, -D / 2 - 0.02, 7.5 * bh), rotation=(math.pi / 2, 0, 0)); w = bpy.context.object; w.scale = (1.0, 1.0, 1); w.data.materials.append(glass)
bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.1, -D / 2 - 0.02, 5 * bh), rotation=(math.pi / 2, 0, 0)); dd = bpy.context.object; dd.scale = (0.8, 2.0, 1); dd.data.materials.append(door)
# toit
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=3.6, depth=1.6, location=(0, 0, ROWS * bh + 0.8), rotation=(0, 0, math.pi / 4)); rf = bpy.context.object; rf.scale = (1.0, 0.8, 1); rf.data.materials.append(roofm)
# sol mouillé (réfléchissant)
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); bpy.context.object.data.materials.append(ground)
# lumière : lune froide + lampe chaude intérieure + monde nocturne
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(55), 0, math.radians(-30))); s = bpy.context.object.data; s.energy = 0.6; s.color = (0.6, 0.7, 1.0); s.angle = 0.05
bpy.ops.object.light_add(type='POINT', location=(0.9, 0, 1.5)); p = bpy.context.object.data; p.energy = 300; p.color = (1.0, 0.65, 0.3)
wd = bpy.data.worlds.new('nuit'); sc.world = wd; wd.use_nodes = True
wd.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.005, 0.012, 1)
# brume volumétrique (rayons de lumière réels autour de la fenêtre)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -2, 3)); fog = bpy.context.object; fog.scale = (30, 30, 6)
fm = bpy.data.materials.new('brume'); fm.use_nodes = True; nt = fm.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
v = nt.nodes.new('ShaderNodeVolumePrincipled'); v.inputs['Density'].default_value = 0.035; v.inputs['Color'].default_value = (0.7, 0.75, 0.9, 1)
nt.links.new(v.outputs[0], nt.nodes['Material Output'].inputs['Volume']); fog.data.materials.append(fm)
# caméra verticale 9:16
bpy.ops.object.camera_add(location=(2.2, -9.5, 1.6), rotation=(math.radians(84), 0, math.radians(13))); sc.camera = bpy.context.object; sc.camera.data.lens = 30
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920; sc.render.resolution_percentage = 50
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
sc.render.filepath = out
t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDU_S', round(time.time() - t0, 1))
