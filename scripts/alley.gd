extends Node3D
## La ruelle, construite uniquement avec des boîtes et des cylindres.
## Axes : X = largeur, Y = hauteur, Z = longueur. La ruelle va de z = +20 (départ) à z = -20 (fond).
## Largeur praticable : 4 m (x de -2 à +2).

const Textures := preload("res://scripts/textures.gd")

var mat_brick: StandardMaterial3D
var mat_ground: StandardMaterial3D
var mat_concrete: StandardMaterial3D
var mat_metal: StandardMaterial3D
var mat_dark: StandardMaterial3D     # fenêtres / portes : presque noir
var mat_trash: StandardMaterial3D

func _ready() -> void:
	_make_materials()
	_build_structure()
	_build_wall_details()
	_build_props()

func _make_materials() -> void:
	mat_brick = Textures.material(Textures.brick(), 4.0)
	mat_ground = Textures.material(Textures.noise(Color(0.15, 0.15, 0.16), 0.12, 0.4, 2), 3.0)
	mat_concrete = Textures.material(Textures.noise(Color(0.26, 0.28, 0.26), 0.08, 0.5, 3), 4.0)
	mat_metal = Textures.material(Textures.noise(Color(0.30, 0.20, 0.13), 0.15, 0.6, 4), 2.0)
	mat_trash = Textures.material(Textures.noise(Color(0.08, 0.09, 0.08), 0.25, 0.3, 5), 1.0)
	mat_dark = StandardMaterial3D.new()
	mat_dark.albedo_color = Color(0.015, 0.015, 0.02)

# --- Gros volumes : sol, immeubles gauche/droite, murs du fond ---
func _build_structure() -> void:
	_box(Vector3(0, -0.5, 0), Vector3(20, 1, 44), mat_ground)          # sol
	_box(Vector3(-6, 6, 0), Vector3(8, 12, 40), mat_brick)             # immeuble gauche
	_box(Vector3(6, 6, 0), Vector3(8, 12, 40), mat_brick)              # immeuble droit
	_box(Vector3(0, 6, -21), Vector3(20, 12, 2), mat_concrete)         # mur du fond
	_box(Vector3(0, 6, 21), Vector3(20, 12, 2), mat_concrete)          # mur du départ

# --- Détails sur les façades : fenêtres, portes, tuyaux ---
func _build_wall_details() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	for side in [-1, 1]:
		var wall_x: float = 2.0 * side            # plan de la façade
		var out_x: float = wall_x - 0.05 * side   # on avance un peu dans la ruelle (0,1 m)
		var z := -17.0
		while z <= 17.0:
			for y in [3.5, 7.0, 10.0]:
				if rng.randf() < 0.75:             # quelques fenêtres manquantes
					_box(Vector3(out_x, y, z), Vector3(0.1, 1.4, 1.0), mat_dark, false)
			if rng.randf() < 0.3:                  # porte au rez-de-chaussée
				_box(Vector3(out_x, 1.1, z + 1.8), Vector3(0.15, 2.2, 1.1), mat_metal, false)
			z += 4.5
		# Tuyaux verticaux collés à la façade
		for pz in [-14.0, -3.0, 7.0, 15.0]:
			_box(Vector3(wall_x - 0.15 * side, 6, pz), Vector3(0.25, 12, 0.25), mat_metal)
	# Poutres en travers de la ruelle, en hauteur
	_box(Vector3(0, 5.0, -4), Vector3(4, 0.25, 0.3), mat_metal)
	_box(Vector3(0, 6.5, 8), Vector3(4, 0.25, 0.3), mat_metal)

# --- Objets au sol : bennes, caisses, barils, sacs-poubelle, obstacle bas ---
func _build_props() -> void:
	_box(Vector3(1.5, 0.6, -6), Vector3(1.0, 1.2, 1.8), mat_metal)         # benne à ordures
	_box(Vector3(-1.4, 0.4, -2), Vector3(1.2, 0.8, 1.2), mat_concrete)     # caisse
	_box(Vector3(-1.5, 1.2, -2.1), Vector3(0.9, 0.8, 0.9), mat_concrete)   # caisse au-dessus
	_cylinder(Vector3(-1.5, 0.5, 9), 0.35, 1.0, mat_metal)                 # barils
	_cylinder(Vector3(-0.9, 0.5, 9.8), 0.35, 1.0, mat_metal)
	_box(Vector3(1.0, 0.6, -12), Vector3(2.0, 1.2, 0.6), mat_concrete)     # muret : à sauter
	_box(Vector3(-1.6, 0.2, -15), Vector3(0.6, 0.4, 0.5), mat_trash)       # sacs-poubelle
	_box(Vector3(-1.2, 0.15, -15.6), Vector3(0.5, 0.3, 0.4), mat_trash)
	_box(Vector3(1.6, 0.2, 4), Vector3(0.6, 0.4, 0.5), mat_trash)
	# Zone libre volontaire côté gauche vers z = -10 : on y mettra le corps (étape 4).

# --- Outils : une boîte / un cylindre visible, avec collision en option ---
func _box(pos: Vector3, size: Vector3, mat: Material, collide := true) -> void:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	mi.material_override = mat
	if not collide:
		mi.position = pos          # décor sans collision : juste le visuel
		add_child(mi)
		return
	var body := StaticBody3D.new()
	body.position = pos
	body.add_child(mi)
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	col.shape = shape
	body.add_child(col)
	add_child(body)

func _cylinder(pos: Vector3, radius: float, height: float, mat: Material) -> void:
	var body := StaticBody3D.new()
	body.position = pos
	var mi := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 8      # peu de côtés = look low-poly
	mi.mesh = mesh
	mi.material_override = mat
	body.add_child(mi)
	var col := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = radius
	shape.height = height
	col.shape = shape
	body.add_child(col)
	add_child(body)
