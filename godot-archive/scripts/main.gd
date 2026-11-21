extends Node3D
## Scène principale : ambiance générale + ruelle + joueur.

func _ready() -> void:
	_build_environment()

	var alley := Node3D.new()
	alley.set_script(load("res://scripts/alley.gd"))
	add_child(alley)

	var player := CharacterBody3D.new()
	player.set_script(load("res://scripts/player.gd"))
	player.position = Vector3(0, 0.1, 17)   # départ côté z = +17, on marche vers -z
	player.rotation.y = 0.0                  # regarde vers -z par défaut
	add_child(player)

## Fond noir + lumière ambiante faible (on l'assombrira à l'étape 3 avec le brouillard).
func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.01, 0.01, 0.02)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.45, 0.5, 0.65)
	env.ambient_light_energy = 0.7
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
