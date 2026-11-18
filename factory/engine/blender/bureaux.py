# Décors 3D (Blender / bpy, Cycles sur processeur) pour le film « 4 business » :
# un open space de nuit, quatre bureaux (L'EGO, L'OBSESSION, LA CHANCE, DISCIPLINE), la ville derrière les vitres.
# Produit des plaques fixes (fonds) + anchors.json : positions à l'écran des sièges, écrans muraux, lampes,
# pour que le moteur canvas pose les personnages animés exactement au bon endroit.
# Usage : python bureaux.py -- <dossier_sortie> [pourcentage_resolution] [echantillons] [plaques séparées par des virgules]
import bpy, math, random, json, sys, os, time
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else '/tmp/plaques'
PCT = int(args[1]) if len(args) > 1 else 100
SAMPLES = int(args[2]) if len(args) > 2 else 64
ONLY = args[3].split(',') if len(args) > 3 else None
os.makedirs(OUT, exist_ok=True)

W_PX, H_PX = 1080, 1920
PLOTS = {'ego': -3.3, 'obsession': -1.1, 'chance': 1.1, 'discipline': 3.3}
SEAT = {'ego': 0.52, 'obsession': 0.5, 'chance': 0.32, 'discipline': 0.5}
DY = 0.3          # profondeur du plan des personnages (y)
WALL_Y = 1.6      # mur du fond

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    random.seed(7)

MATS = {}
def mat(name, color, rough=0.6, metal=0.0, emit=0.0, emit_color=None):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*(emit_color or color), 1)
        b.inputs['Emission Strength'].default_value = emit
    MATS[name] = m
    return m

def box(loc, size, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = size; o.data.materials.append(m); return o

def cyl(loc, r, depth, m, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object; o.data.materials.append(m); return o

def build(variant='nuit'):
    reset(); MATS.clear()
    dawn = variant == 'aube'
    sc = bpy.context.scene
    # ---- monde : ciel nocturne ou aube
    wd = bpy.data.worlds.new('ciel'); sc.world = wd; wd.use_nodes = True
    bg = wd.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.35, 0.16, 0.08, 1) if dawn else (0.008, 0.011, 0.025, 1)
    bg.inputs['Strength'].default_value = 1.0 if dawn else 1.0
    # ---- sol brillant (reflets) + plafond
    box((0, 3, -0.05), (40, 30, 0.1), mat('sol', (0.05, 0.048, 0.05), rough=0.16))
    box((0, -6, 4.2), (40, 30, 0.1), mat('plafond', (0.02, 0.02, 0.025), rough=0.9))
    # ---- mur du fond avec 5 grandes baies vitrées
    wall = mat('mur', (0.075, 0.072, 0.08), rough=0.85)
    frame = mat('cadre', (0.01, 0.01, 0.012), rough=0.4, metal=0.6)
    xs = [-4.4, -2.2, 0, 2.2, 4.4]
    box((0, WALL_Y + 0.1, 0.45), (14, 0.2, 0.9), wall)          # allège
    box((0, WALL_Y + 0.1, 3.85), (14, 0.2, 0.9), wall)          # linteau
    for i in range(len(xs) + 1):
        x = -6.6 + i * 2.2
        box((x, WALL_Y + 0.1, 2.15), (0.5, 0.2, 2.5), wall)      # trumeaux
    for x in xs:
        box((x, WALL_Y + 0.05, 2.15), (0.04, 0.06, 2.5), frame)  # meneau
    # ---- la ville dehors : immeubles sombres + fenêtres allumées
    bmat = mat('immeuble', (0.02, 0.022, 0.035), rough=0.9)
    lit = [mat(f'fen{i}', c, emit=e) for i, (c, e) in enumerate([((1.0, 0.7, 0.35), 6), ((0.7, 0.8, 1.0), 4), ((1.0, 0.85, 0.6), 3)])]
    for k in range(70):
        x = random.uniform(-26, 26); y = random.uniform(12, 55); h = random.uniform(4, 28); w = random.uniform(2, 5)
        box((x, y, h / 2), (w, 2.5, h), bmat)
        for _ in range(int(h * w * 0.35)):
            if random.random() < (0.55 if not dawn else 0.15):
                fx = x + random.uniform(-w / 2 + 0.3, w / 2 - 0.3); fz = random.uniform(1, h - 0.5)
                box((fx, y - 1.27, fz), (0.35, 0.02, 0.45), random.choice(lit))
    if dawn:
        bpy.ops.object.light_add(type='SUN', rotation=(math.radians(80), 0, math.radians(200)))
        s = bpy.context.object.data; s.energy = 4.0; s.color = (1.0, 0.62, 0.35); s.angle = 0.02
    else:
        bpy.ops.object.light_add(type='SUN', rotation=(math.radians(60), 0, math.radians(160)))
        s = bpy.context.object.data; s.energy = 0.15; s.color = (0.55, 0.65, 1.0)
    # ---- quatre bureaux
    desk_top = mat('plateau', (0.09, 0.09, 0.1), rough=0.35)
    leg = mat('pied', (0.02, 0.02, 0.022), rough=0.3, metal=0.8)
    screen_off = mat('ecran', (0.0, 0.0, 0.0), rough=0.15, emit=1.5, emit_color=(0.03, 0.06, 0.14))
    lampm = mat('abatjour', (1.0, 0.72, 0.42), emit=25)
    laptop = mat('portable', (0.25, 0.26, 0.28), rough=0.3, metal=0.7)
    lapscr = mat('portable_ecran', (0, 0, 0), emit=6, emit_color=(0.55, 0.7, 1.0))
    for who, c in PLOTS.items():
        top = gold = None
        if who == 'ego':
            top = mat('or', (0.9, 0.62, 0.18), rough=0.2, metal=1.0)
        box((c + 0.3, DY, 0.74), (1.2, 0.65, 0.05), top or desk_top)
        for dx in (-0.25, 0.85):
            box((c + dx, DY, 0.37), (0.04, 0.55, 0.72), leg)
        # ordinateur portable (vu de profil : écran tourné vers la gauche, vers le personnage)
        box((c + 0.05, DY, 0.775), (0.32, 0.22, 0.02), laptop)
        o = box((c + 0.21, DY, 0.92), (0.02, 0.22, 0.3), laptop, rot=(0, math.radians(-12), 0))
        box((c + 0.195, DY, 0.92), (0.005, 0.2, 0.27), lapscr, rot=(0, math.radians(-12), 0))
        # écran mural (contenu dessiné par le moteur)
        box((c + 0.3, WALL_Y - 0.02, 1.95), (1.15, 0.04, 0.68), mat('cadre_ecran', (0.01, 0.01, 0.01), rough=0.3))
        box((c + 0.3, WALL_Y - 0.05, 1.95), (1.08, 0.02, 0.61), screen_off)
        # suspension + lumière chaude sur le bureau
        cyl((c + 0.3, DY, 3.4), 0.006, 1.6, leg)
        bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.26, radius2=0.08, depth=0.24, location=(c + 0.3, DY, 2.55))
        bpy.context.object.data.materials.append(mat('suspension', (0.02, 0.02, 0.02), rough=0.3, metal=0.9))
        cyl((c + 0.3, DY, 2.44), 0.12, 0.02, lampm)
        bpy.ops.object.light_add(type='SPOT', location=(c + 0.3, DY, 2.4))
        L = bpy.context.object.data; L.energy = 520; L.color = (1.0, 0.72, 0.45); L.spot_size = math.radians(75); L.spot_blend = 0.6; L.shadow_soft_size = 0.15
        # appoint doux (face) + lumière rasante sur le mur derrière le bureau
        bpy.ops.object.light_add(type='AREA', location=(c + 0.1, DY - 2.2, 2.2), rotation=(math.radians(65), 0, 0))
        A = bpy.context.object.data; A.energy = 55; A.size = 2.0; A.color = (0.75, 0.8, 1.0) if not dawn else (1.0, 0.8, 0.6)
        bpy.ops.object.light_add(type='POINT', location=(c + 0.3, WALL_Y - 0.4, 3.7))
        P = bpy.context.object.data; P.energy = 90; P.color = (1.0, 0.78, 0.55); P.shadow_soft_size = 0.3
        # sièges et accessoires propres à chaque caractère
        if who == 'ego':
            g = mat('or', (0.9, 0.62, 0.18), rough=0.2, metal=1.0)
            box((c - 0.55, DY, 0.48), (0.5, 0.5, 0.08), g); box((c - 0.82, DY, 1.05), (0.08, 0.5, 1.2), g)  # trône
            bpy.ops.mesh.primitive_torus_add(location=(c - 0.25, DY - 0.2, 1.5), rotation=(math.radians(90), 0, 0), major_radius=0.32, minor_radius=0.025)
            bpy.context.object.data.materials.append(mat('anneau', (1, 1, 1), emit=12))   # lampe annulaire à selfies
            cyl((c - 0.25, DY - 0.2, 0.75), 0.012, 1.5, leg)
        elif who == 'obsession':
            box((c - 0.55, DY, 0.48), (0.4, 0.4, 0.06), leg); cyl((c - 0.55, DY, 0.24), 0.03, 0.46, leg)
            for k, (dx, dz) in enumerate([(0.55, 1.05), (0.75, 1.05), (0.62, 1.32)]):          # écrans empilés
                box((c + dx, DY + 0.1, dz), (0.04, 0.4, 0.26), leg)
                box((c + dx - 0.025, DY + 0.1, dz), (0.005, 0.37, 0.23), mat(f'obs_scr{k}', (0, 0, 0), emit=5, emit_color=(0.7, 0.45, 1.0)))
            for k in range(6):                                                                  # tasses de café
                cyl((c + 0.35 + k * 0.07 - 0.2, DY - 0.15 + (k % 2) * 0.1, 0.81), 0.035, 0.09, mat('tasse', (0.85, 0.85, 0.82), rough=0.4))
            for k in range(14):                                                                 # feuilles au sol
                box((c + random.uniform(-0.9, 1.2), DY + random.uniform(-0.6, 0.4), 0.003), (0.21, 0.29, 0.002), mat('papier', (0.8, 0.8, 0.78), rough=0.9), rot=(0, 0, random.uniform(0, 3)))
        elif who == 'chance':
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=(c - 0.55, DY, 0.26)); bb = bpy.context.object; bb.scale = (1.1, 1.0, 0.6)
            bb.data.materials.append(mat('pouf', (0.18, 0.5, 0.28), rough=0.7)); bpy.ops.object.shade_smooth()
            cyl((c + 1.15, DY - 0.1, 0.2), 0.16, 0.4, mat('pot', (0.25, 0.12, 0.06)))
            bpy.ops.mesh.primitive_ico_sphere_add(radius=0.32, location=(c + 1.15, DY - 0.1, 0.65)); bpy.context.object.data.materials.append(mat('plante', (0.08, 0.3, 0.1), rough=0.8))
        else:  # discipline : bureau rangé, caméra sur trépied, plante, calendrier
            box((c - 0.55, DY, 0.48), (0.42, 0.42, 0.06), leg); box((c - 0.74, DY, 0.85), (0.05, 0.42, 0.7), leg)
            for a in (-25, 0, 25):
                o = cyl((c + 1.2, DY - 0.1, 0.65), 0.012, 1.3, leg); o.rotation_euler = (math.radians(a * 0.4), math.radians(a), 0)
            box((c + 1.2, DY - 0.1, 1.33), (0.16, 0.1, 0.11), leg); cyl((c + 1.12, DY - 0.1, 1.33), 0.04, 0.06, leg, rot=(0, math.radians(90), 0))
            cyl((c + 0.75, DY + 0.1, 0.84), 0.06, 0.14, mat('pot', (0.25, 0.12, 0.06)))
            bpy.ops.mesh.primitive_ico_sphere_add(radius=0.11, location=(c + 0.75, DY + 0.1, 0.98)); bpy.context.object.data.materials.append(mat('plante', (0.08, 0.3, 0.1), rough=0.8))
            box((c - 0.35, WALL_Y - 0.02, 1.6), (0.4, 0.02, 0.45), mat('calendrier', (0.85, 0.85, 0.82), rough=0.9))
            if dawn:  # le succès : des colis prêts à partir
                cm = mat('carton', (0.45, 0.3, 0.16), rough=0.9)
                for k, (dx, dz, s) in enumerate([(1.0, 0.15, 0.3), (1.32, 0.15, 0.3), (1.15, 0.45, 0.28), (1.6, 0.13, 0.26)]):
                    box((c + dx, DY + 0.35, dz), (s, s, s), cm)
    # brume légère (volumes lumineux sous les suspensions)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 2)); fog = bpy.context.object; fog.scale = (16, 6, 4.2)
    fm = bpy.data.materials.new('brume'); fm.use_nodes = True; nt = fm.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    v = nt.nodes.new('ShaderNodeVolumePrincipled'); v.inputs['Density'].default_value = 0.012 if not dawn else 0.02
    nt.links.new(v.outputs[0], nt.nodes['Material Output'].inputs['Volume']); fog.data.materials.append(fm)

def camera(name, x, dist, z, lens):
    cam = bpy.data.cameras.new(name); cam.lens = lens; cam.sensor_fit = 'HORIZONTAL'; cam.sensor_width = 36
    o = bpy.data.objects.new(name, cam); bpy.context.scene.collection.objects.link(o)
    o.location = (x, DY - dist, z); o.rotation_euler = (math.radians(90), 0, 0)
    return o

def px(cam, p):
    sc = bpy.context.scene
    v = world_to_camera_view(sc, cam, Vector(p))
    return [round(v.x * W_PX, 1), round((1 - v.y) * H_PX, 1)]

def anchors(cam):
    a = {}
    for who, c in PLOTS.items():
        a[who] = {
            'seat': px(cam, (c - 0.55, DY, SEAT[who])),
            'floor': px(cam, (c - 0.55, DY, 0)),
            'desk': px(cam, (c + 0.3, DY, 0.77)),
            'laptop': px(cam, (c + 0.19, DY, 0.92)),
            'monitor': px(cam, (c + 0.3 - 0.54, WALL_Y - 0.07, 1.95 + 0.305)) + px(cam, (c + 0.3 + 0.54, WALL_Y - 0.07, 1.95 - 0.305)),
            'lamp': px(cam, (c + 0.3, DY, 2.44)),
            'ppm': round(px(cam, (c, DY, 0))[1] - px(cam, (c, DY, 1))[1], 2),
        }
    return a

# plaques : nom → (variante, centre x, distance, hauteur caméra, focale)
PLATES = {
    'large_nuit': ('nuit', 0.0, 11.5, 1.35, 38),
    'ego': ('nuit', PLOTS['ego'] + 0.15, 4.0, 1.2, 40),
    'obsession': ('nuit', PLOTS['obsession'] + 0.15, 4.0, 1.2, 40),
    'chance': ('nuit', PLOTS['chance'] + 0.15, 4.0, 1.2, 40),
    'discipline': ('nuit', PLOTS['discipline'] + 0.15, 4.0, 1.2, 40),
    'large_aube': ('aube', 0.0, 11.5, 1.35, 38),
}

meta = {}
mf = os.path.join(OUT, 'anchors.json')
if os.path.exists(mf): meta = json.load(open(mf))
built = None
for name, (variant, x, dist, z, lens) in PLATES.items():
    if ONLY and name not in ONLY: continue
    if built != variant: build(variant); built = variant
    sc = bpy.context.scene
    cam = camera('cam_' + name, x, dist, z, lens); sc.camera = cam
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.render.resolution_x, sc.render.resolution_y = W_PX, H_PX; sc.render.resolution_percentage = PCT
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'; sc.view_settings.exposure = 0.35
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 92
    sc.render.filepath = os.path.join(OUT, name + '.jpg')
    t0 = time.time(); bpy.ops.render.render(write_still=True)
    meta[name] = anchors(cam)
    print('PLAQUE', name, round(time.time() - t0, 1), 's', flush=True)
json.dump(meta, open(mf, 'w'), indent=1)
