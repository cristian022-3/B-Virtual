// ===============================
// Generar tarjeta de un libro
// ===============================
function crearTarjetaLibro(libro) {

	let badgeClass = "badge-status";
	let badgeTexto = "Disponible";

	if (libro.formato === "digital") {
		badgeClass += " digital";
		badgeTexto = "Digital";
	}
	else if (!libro.disponible || libro.cantidad_disponible <= 0) {
		badgeClass += " prestado";
		badgeTexto = "Prestado";
	}

	return `
		<div class="product-item">
			<figure class="product-style">
				<img src="${libro.portada_url || 'images/product-item1.jpg'}"
					 alt="${libro.titulo}"
					 class="product-item">

				<button
					type="button"
					class="add-to-cart"
					data-libro-id="${libro.id}">
					Ver detalles
				</button>
			</figure>

			<figcaption>
				<h3>${libro.titulo}</h3>
				<span>${libro.autor}</span>
				<span class="${badgeClass}">
					${badgeTexto}
				</span>
			</figcaption>
		</div>
	`;
}

let librosCargados = [];


// ===============================
// Cargar libros
// ===============================
async function cargarLibros(filtros = {}) {

	let query = supabaseClient
		.from("libros")
		.select("*");

	if (filtros.texto) {
		query = query.or(
			`titulo.ilike.%${filtros.texto}%,autor.ilike.%${filtros.texto}%`
		);
	}

	if (filtros.categoria) {
		query = query.eq("categoria", filtros.categoria);
	}

	if (filtros.disponibilidad === "disponible") {
		query = query
			.eq("disponible", true)
			.eq("formato", "fisico");
	}
	else if (filtros.disponibilidad === "digital") {
		query = query.eq("formato", "digital");
	}
	else if (filtros.disponibilidad === "prestado") {
		query = query.eq("disponible", false);
	}

	// Traer TODOS los libros
	const { data: libros, error } = await query.order("titulo");

	const contenedor = $("#librosDestacados");

	if (error) {
		console.error(error);
		contenedor.html("<p>Error al cargar libros</p>");
		return;
	}

	if (!libros || libros.length === 0) {
		contenedor.html("<p>No hay libros.</p>");
		return;
	}

	librosCargados = libros;

	// destruir slider anterior
	if (contenedor.hasClass("slick-initialized")) {
		contenedor.slick("unslick");
	}

	// insertar tarjetas
	contenedor.html(
		libros.map(crearTarjetaLibro).join("")
	);

	// crear slider
	contenedor.slick({

		slidesToShow: 4,
		slidesToScroll: 4,

		arrows: true,

		dots: false,

		infinite: false,

		prevArrow: $(".catalogo-prev"),

		nextArrow: $(".catalogo-next"),

		responsive: [

			{
				breakpoint: 992,
				settings: {
					slidesToShow: 3,
					slidesToScroll: 3
				}
			},

			{
				breakpoint: 768,
				settings: {
					slidesToShow: 2,
					slidesToScroll: 2
				}
			},

			{
				breakpoint: 576,
				settings: {
					slidesToShow: 1,
					slidesToScroll: 1
				}
			}

		]

	});

}


// ===============================
// Buscador
// ===============================
document
.querySelector("#search-section form")
.addEventListener("submit", function(e){

	e.preventDefault();

	cargarLibros({

		texto:
			document.querySelector("#searchQuery").value.trim(),

		categoria:
			document.querySelector("#searchCategory").value,

		disponibilidad:
			document.querySelector("#searchAvailability").value

	});

});


// ===============================
// Inicio
// ===============================
document.addEventListener("DOMContentLoaded", function(){

	cargarLibros();

});


// ===============================
// Evento Ver Detalles
// ===============================
$(document).on("click", ".add-to-cart", function(){

	const id = $(this).data("libro-id");

	const libro = librosCargados.find(l => l.id == id);

	if(libro){

		abrirDetalleLibro(libro);

	}

});