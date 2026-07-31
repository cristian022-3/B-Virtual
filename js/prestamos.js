let libroSeleccionado = null;

let montoMultaPorDia = 0;

async function cargarConfiguracionMulta() {
	const { data, error } = await supabaseClient
		.from('configuracion')
		.select('valor')
		.eq('clave', 'multa_por_dia')
		.single();

	if (!error && data) {
		montoMultaPorDia = parseInt(data.valor);
		document.querySelector('#montoMultaTexto').textContent =
			`$${montoMultaPorDia.toLocaleString('es-CO')} COP`;
	}
}

document.addEventListener('DOMContentLoaded', cargarConfiguracionMulta);
function calcularFechaDevolucion(fechaRetiro) {
	const fecha = new Date(fechaRetiro);
	fecha.setDate(fecha.getDate() + 15); // 15 días de préstamo
	return fecha;
}

function formatearFecha(fecha) {
	return fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

function mostrarDetalleLibro(libroId) {
	const libro = librosCargados.find(l => l.id == libroId);
	if (!libro) return;

	libroSeleccionado = libro;

	document.querySelector('#modalLibroTitulo').textContent = libro.titulo;
	document.querySelector('#modalLibroAutor').textContent = libro.autor;
	document.querySelector('#modalLibroCategoria').textContent = libro.categoria || 'Sin categoría';
	document.querySelector('#modalLibroDescripcion').textContent = libro.descripcion || '';
	document.querySelector('#modalLibroPortada').src = libro.portada_url || 'images/product-item1.jpg';
	document.querySelector('#modalLibroContraportada').src = libro.contraportada_url || libro.portada_url || 'images/product-item1.jpg';

	const badge = document.querySelector('#modalLibroBadge');
	badge.className = 'badge-status';
	const disponibleParaPrestamo = libro.formato !== 'digital' && libro.disponible && libro.cantidad_disponible > 0;

	if (libro.formato === 'digital') {
		badge.classList.add('digital');
		badge.textContent = 'Digital';
	} else if (!disponibleParaPrestamo) {
		badge.classList.add('prestado');
		badge.textContent = 'Prestado';
	} else {
		badge.textContent = 'Disponible';
	}

	// Mostrar/ocultar bloque de préstamo según disponibilidad
	document.querySelector('#bloquePrestamo').classList.toggle('d-none', !disponibleParaPrestamo);
	document.querySelector('#bloqueNoDisponible').classList.toggle('d-none', disponibleParaPrestamo);

	// Resetear formulario
	document.querySelector('#prestamoError').classList.add('d-none');
	document.querySelector('#prestamoExito').classList.add('d-none');
	document.querySelector('#checkConsentimiento').checked = false;
	document.querySelector('#btnConfirmarPrestamo').disabled = true;

	const hoy = new Date().toISOString().split('T')[0];
	const inputFecha = document.querySelector('#fechaRetiro');
	inputFecha.min = hoy;
	inputFecha.value = hoy;
	document.querySelector('#fechaDevolucion').value = formatearFecha(calcularFechaDevolucion(hoy));

	const modal = new bootstrap.Modal(document.querySelector('#modalDetalleLibro'));
	modal.show();
}

// Actualizar fecha de devolución cuando cambia la fecha de retiro
document.querySelector('#fechaRetiro').addEventListener('change', function () {
	document.querySelector('#fechaDevolucion').value = formatearFecha(calcularFechaDevolucion(this.value));
});

// Habilitar/deshabilitar el botón según el checkbox
document.querySelector('#checkConsentimiento').addEventListener('change', function () {
	document.querySelector('#btnConfirmarPrestamo').disabled = !this.checked;
});

// Confirmar préstamo
document.querySelector('#btnConfirmarPrestamo').addEventListener('click', async () => {
	const errorBox = document.querySelector('#prestamoError');
	const exitoBox = document.querySelector('#prestamoExito');
	errorBox.classList.add('d-none');
	exitoBox.classList.add('d-none');

	const { data: { session } } = await supabaseClient.auth.getSession();
	if (!session) {
		errorBox.textContent = 'Debes iniciar sesión para solicitar un préstamo.';
		errorBox.classList.remove('d-none');
		return;
	}

	if (!libroSeleccionado) return;

	const fechaRetiro = document.querySelector('#fechaRetiro').value;
	const fechaDevolucionEsperada = calcularFechaDevolucion(fechaRetiro).toISOString();
	const usuarioId = session.user.id;

	// 1. Insertar el préstamo
	const { data: prestamo, error: errorPrestamo } = await supabaseClient
		.from('prestamos')
		.insert({
			usuario_id: usuarioId,
			libro_id: libroSeleccionado.id,
			fecha_prestamo: new Date(fechaRetiro).toISOString(),
			fecha_devolucion_esperada: fechaDevolucionEsperada,
			estado: 'activo'
		})
		.select()
		.single();

	if (errorPrestamo) {
		errorBox.textContent = 'Error al crear el préstamo: ' + errorPrestamo.message;
		errorBox.classList.remove('d-none');
		return;
	}
    const datosRecibo = {
	prestamoId: prestamo.id,
	usuarioEmail: session.user.email,
	titulo: libroSeleccionado.titulo,
	autor: libroSeleccionado.autor,
	fechaRetiro: formatearFecha(new Date(fechaRetiro)),
	fechaDevolucion: formatearFecha(calcularFechaDevolucion(fechaRetiro)),
	montoMulta: montoMultaPorDia
};


	// 2. Registrar el consentimiento
	await supabaseClient.from('consentimientos').insert({
	usuario_id: usuarioId,
	tipo: 'condiciones_prestamo',
	user_agent: navigator.userAgent
});

	// 3. Actualizar disponibilidad del libro
	const nuevaCantidad = libroSeleccionado.cantidad_disponible - 1;
	await supabaseClient
		.from('libros')
		.update({
			cantidad_disponible: nuevaCantidad,
			disponible: nuevaCantidad > 0
		})
		.eq('id', libroSeleccionado.id);

	// 4. Mostrar éxito y recargar catálogo
	exitoBox.textContent = `¡Préstamo confirmado! Debes devolver el libro antes del ${formatearFecha(calcularFechaDevolucion(fechaRetiro))}.`;
    exitoBox.classList.remove('d-none');
    document.querySelector('#bloquePrestamo').querySelectorAll('input, button').forEach(el => el.disabled = true);

    const btnRecibo = document.querySelector('#btnDescargarRecibo');
    btnRecibo.classList.remove('d-none');
    btnRecibo.disabled = false;
    btnRecibo.onclick = () => generarReciboPDF(datosRecibo);

    cargarLibros();
});

// Conectar los botones "Ver detalles" cada vez que se recarga el catálogo
document.addEventListener('click', (e) => {
	if (e.target.matches('[data-libro-id]')) {
		mostrarDetalleLibro(e.target.dataset.libroId);
	}
});
