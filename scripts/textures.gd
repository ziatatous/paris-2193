extends RefCounted
## Fabrique de textures procédurales : on dessine pixel par pixel avec du code,
## donc aucun fichier image à télécharger. Textures volontairement petites (64x64)
## pour un rendu "PS1" bien pixélisé.

const SIZE := 64

## Mur de briques : rangées de 8 px de haut, briques de 16 px de large, une rangée sur deux décalée.
static func brick() -> ImageTexture:
	var img := Image.create(SIZE, SIZE, false, Image.FORMAT_RGB8)
	var rng := RandomNumberGenerator.new()
	rng.seed = 1
	for y in SIZE:
		var row := floori(y / 8.0)
		var offset := 8 if row % 2 == 1 else 0   # décalage une rangée sur deux
		for x in SIZE:
			var xx := (x + offset) % SIZE
			var col := floori(xx / 16.0)
			var grain := rng.randf_range(0.8, 1.1)   # grain aléatoire par pixel
			if y % 8 == 0 or xx % 16 == 0:
				# Joint de mortier : sombre
				img.set_pixel(x, y, Color(0.12, 0.11, 0.10) * grain)
			else:
				# Chaque brique a sa propre teinte (calculée à partir de sa position)
				var v := float(posmod(hash(Vector2i(col, row)), 100)) / 100.0
				var c := Color(0.30 + v * 0.12, 0.13 + v * 0.05, 0.10 + v * 0.04)
				img.set_pixel(x, y, Color(c.r * grain, c.g * grain, c.b * grain))
	return ImageTexture.create_from_image(img)

## Texture bruitée d'une couleur de base (asphalte, béton, rouille...).
## amount = intensité du bruit, blotch = taches larges plus ou moins visibles.
static func noise(base: Color, amount: float, blotch: float, seed_value: int) -> ImageTexture:
	var img := Image.create(SIZE, SIZE, false, Image.FORMAT_RGB8)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var n := FastNoiseLite.new()   # bruit "doux" pour les grandes taches
	n.seed = seed_value
	n.frequency = 0.08
	for y in SIZE:
		for x in SIZE:
			var k := 1.0 + n.get_noise_2d(x, y) * blotch + rng.randf_range(-amount, amount)
			if rng.randf() < 0.02:
				k += 0.35   # petits éclats clairs
			img.set_pixel(x, y, Color(base.r * k, base.g * k, base.b * k))
	return ImageTexture.create_from_image(img)

## Crée un matériau avec la texture, filtrage "nearest" (pixels nets).
## meters_per_tile = taille réelle (en mètres) d'une répétition de la texture.
## "Triplanar" = la texture se projette selon l'espace monde : pas besoin de régler
## les UV, et elle ne s'étire pas quelle que soit la taille de la boîte.
static func material(tex: Texture2D, meters_per_tile: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_texture = tex
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	m.uv1_triplanar = true
	m.uv1_world_triplanar = true
	m.uv1_scale = Vector3.ONE / meters_per_tile
	m.roughness = 1.0
	return m
