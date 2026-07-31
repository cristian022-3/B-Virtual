async function verificarSiEsAdmin() {
	const { data: { session } } = await supabaseClient.auth.getSession();
	if (!session) return false;

	const { data: usuario } = await supabaseClient
		.from('usuarios')
		.select('tipo_usuario')
		.eq('id', session.user.id)
		.single();

	return usuario?.tipo_usuario === 'admin';
}

async function actualizarVisibilidadAdmin() {
	const esAdmin = await verificarSiEsAdmin();
	document.querySelector('#btnPanelAdmin').classList.toggle('d-none', !esAdmin);
}

async function cargarPanelAdmin() {
	const contenedor = document.querySelector('#listaAdminPrestamos');
	contenedor.innerHTML = '<p class="text-center text-muted py-4">Cargando préstamos...</p>';

	const { data: prestamos, error } = await supabaseClient
		.from('prestamos')
		.select('*, libros(titulo, autor, portada_url), usuarios(nombre, email)')
		.order('fecha_prestamo', { ascending: false });

	if (error) {
		contenedor.innerHTML = '<p class="text-center text-danger py-4">Error al cargar los préstamos.</p>';
		return;
	}

	if (!prestamos || prestamos.length === 0) {
		contenedor.innerHTML = '<p class="text-center text-muted py-4">No hay préstamos registrados.</p>';
		return;
	}

	const hoy = new Date();

	contenedor.innerHTML = prestamos.map(p => {
		const libro = p.libros;
		const usuario = p.usuarios;
		const fechaLimite = new Date(p.fecha_devolucion_esperada);
		let estadoClase = 'activo';
		let estadoTexto = 'Activo';

		if (p.estado === 'devuelto') {
			estadoClase = 'devuelto';
			estadoTexto = 'Devuelto';
		} else if (hoy > fechaLimite) {
			estadoClase = 'vencido';
			estadoTexto = 'Vencido';
		}

		const botonDevolucion = p.estado === 'devuelto'
			? ''
			: `<button class="btn btn-sm btn-confirmar-prestamo mt-2" onclick="marcarComoDevuelto(${p.id})">
				<i class="bi bi-check-circle"></i> Marcar como devuelto
			   </button>`;

		return `
			<div class="prestamo-item">
				<img src="${libro?.portada_url || 'images/product-item1.jpg'}" alt="${libro?.titulo || ''}">
				<div class="prestamo-info">
					<h6>${libro?.titulo || 'Libro no disponible'}</h6>
					<p><strong>Usuario:</strong> ${usuario?.nombre || usuario?.email || 'Desconocido'}</p>
					<p>Retiro: ${formatearFecha(new Date(p.fecha_prestamo))} · Límite: ${formatearFecha(fechaLimite)}</p>
					<span class="prestamo-estado ${estadoClase}">${estadoTexto}</span>
					${botonDevolucion}
				</div>
			</div>
		`;
	}).join('');
}

async function marcarComoDevuelto(prestamoId) {
	const { data: prestamo, error: errorConsulta } = await supabaseClient
		.from('prestamos')
		.select('*, libros(cantidad_disponible)')
		.eq('id', prestamoId)
		.single();

	if (errorConsulta || !prestamo) {
		alert('No se pudo encontrar el préstamo.');
		return;
	}

	const hoy = new Date();
	const fechaLimite = new Date(prestamo.fecha_devolucion_esperada);
	const diasRetraso = Math.max(0, Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24)));

	// 1. Marcar préstamo como devuelto
	await supabaseClient
		.from('prestamos')
		.update({
			estado: 'devuelto',
			fecha_devolucion_real: hoy.toISOString()
		})
		.eq('id', prestamoId);

	// 2. Si hay retraso, crear multa
	if (diasRetraso > 0) {
		const montoMulta = diasRetraso * montoMultaPorDia;
		await supabaseClient.from('multas').insert({
			prestamo_id: prestamoId,
			usuario_id: prestamo.usuario_id,
			monto: montoMulta,
			pagada: false
		});
	}

	// 3. Devolver el ejemplar al inventario
	const nuevaCantidad = (prestamo.libros?.cantidad_disponible || 0) + 1;
	await supabaseClient
		.from('libros')
		.update({
			cantidad_disponible: nuevaCantidad,
			disponible: true
		})
		.eq('id', prestamo.libro_id);

	cargarPanelAdmin(); // refrescar la lista
}

document.querySelector('#btnPanelAdmin').addEventListener('click', (e) => {
	e.preventDefault();
	bootstrap.Modal.getInstance(document.querySelector('#modalCuenta')).hide();

	setTimeout(() => {
		const modal = new bootstrap.Modal(document.querySelector('#modalAdmin'));
		modal.show();
		cargarPanelAdmin();
	}, 300);
});

document.addEventListener('DOMContentLoaded', actualizarVisibilidadAdmin);