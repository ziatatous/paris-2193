extends CharacterBody3D
## Joueur en première personne.
## Tout est créé par code : pas besoin de configurer des nœuds dans l'éditeur.

# --- Réglages (modifiables pour tester le "feeling") ---
const WALK_SPEED := 4.0        # mètres par seconde en marchant
const SPRINT_SPEED := 8.0      # vitesse en sprintant (Shift)
const JUMP_VELOCITY := 5.0     # force du saut
const MOUSE_SENSITIVITY := 0.002
const ACCEL := 12.0            # plus c'est grand, plus on démarre/stoppe vite

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var head: Node3D               # pivot vertical (regarder haut/bas)
var camera: Camera3D

func _ready() -> void:
	# 1) Le corps physique : une capsule (comme une pilule) de 1,8 m de haut.
	var col := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.4
	capsule.height = 1.8
	col.shape = capsule
	col.position.y = 0.9  # on la monte pour que les pieds soient à y = 0
	add_child(col)

	# 2) La tête : un nœud à hauteur des yeux, qui porte la caméra.
	head = Node3D.new()
	head.position.y = 1.6
	add_child(head)
	camera = Camera3D.new()
	camera.current = true
	head.add_child(camera)

	# 3) On capture la souris (elle disparaît et tourne la caméra).
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
	# Mouvement de souris -> rotation de la vue.
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.screen_relative.x * MOUSE_SENSITIVITY)           # gauche/droite : tout le corps
		head.rotate_x(-event.screen_relative.y * MOUSE_SENSITIVITY)      # haut/bas : seulement la tête
		head.rotation.x = clamp(head.rotation.x, deg_to_rad(-89), deg_to_rad(89))

	# Échap : libère la souris. Clic : la reprend.
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	if event is InputEventMouseButton and event.pressed:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _physics_process(delta: float) -> void:
	# Gravité : on tombe tant qu'on n'est pas au sol.
	if not is_on_floor():
		velocity.y -= gravity * delta

	# Saut (Espace).
	if Input.is_physical_key_pressed(KEY_SPACE) and is_on_floor():
		velocity.y = JUMP_VELOCITY

	# Direction voulue. On utilise les touches PHYSIQUES : W/A/S/D en QWERTY
	# correspondent à Z/Q/S/D en AZERTY, donc ça marche pour tout le monde.
	var input := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_W): input.y -= 1   # avancer
	if Input.is_physical_key_pressed(KEY_S): input.y += 1   # reculer
	if Input.is_physical_key_pressed(KEY_A): input.x -= 1   # gauche
	if Input.is_physical_key_pressed(KEY_D): input.x += 1   # droite
	input = input.normalized()

	# On convertit en direction 3D dans le sens où le joueur regarde.
	var dir := (transform.basis * Vector3(input.x, 0, input.y)).normalized()
	var speed := SPRINT_SPEED if Input.is_physical_key_pressed(KEY_SHIFT) else WALK_SPEED

	# On rapproche progressivement la vitesse de la cible (pas de démarrage brutal).
	velocity.x = move_toward(velocity.x, dir.x * speed, ACCEL * delta * speed)
	velocity.z = move_toward(velocity.z, dir.z * speed, ACCEL * delta * speed)

	move_and_slide()
