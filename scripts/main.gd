extends Node3D
## Scène principale. Pour l'étape 1 : une salle de test grise pour vérifier
## que le joueur se déplace et que les collisions marchent.

func _ready() -> void:
	_build_environment()
	_add_box(Vector3(0, -0.5, 0), Vector3(40, 1, 40))        # sol
	_add_box(Vector3(0, 2, -20), Vector3(40, 4, 1))          # mur nord
	_add_box(Vector3(0, 2, 20), Vector3(40, 4, 1))           # mur sud
	_add_box(Vector3(-20, 2, 0), Vector3(1, 4, 40))          # mur ouest
	_add_box(Vector3(20, 2, 0), Vector3(1, 4, 40))           # mur est
	# Quelques obstacles pour tester saut et collisions
	_add_box(Vector3(4, 0.5, -6), Vector3(2, 1, 2))
	_add_box(Vector3(-5, 1, -8), Vector3(3, 2, 3))
	_add_box(Vector3(0, 0.25, -3), Vector3(6, 0.5, 1))

	var player := CharacterBody3D.new()
	player.set_script(load("res://scripts/player.gd"))
	player.position = Vector3(0, 0.1, 5)
	add_child(player)

## Fond sombre + une lumière douce (juste pour y voir quelque chose).
func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.02, 0.02, 0.03)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.5, 0.55, 0.65)
	env.ambient_light_energy = 0.6
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50, 30, 0)
	sun.light_energy = 0.5
	add_child(sun)

## Crée une boîte solide (visible + collision) : notre brique de base pour tout le décor.
func _add_box(pos: Vector3, size: Vector3) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.position = pos

	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_instance.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.35, 0.35, 0.38)
	mesh_instance.material_override = mat
	body.add_child(mesh_instance)

	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	col.shape = shape
	body.add_child(col)

	add_child(body)
	return body
