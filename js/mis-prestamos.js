async function cargarMisPrestamos() {
	const contenedor = document.querySelector('#listaMisPrestamos');
	contenedor.innerHTML = '<p class="text-center text-muted py-4">Cargando tus préstamos...</p>';

	const { data: { session } } = await supabaseClient.auth.getSession();
	if (!session) {
		contenedor.innerHTML = '<p class="text-center text-muted py-4">Debes iniciar sesión para ver tus préstamos.</p>';
		return;
	}

	const { data: prestamos, error } = await supabaseClient
		.from('prestamos')
		.select('*, libros(titulo, autor, portada_url)')
		.eq('usuario_id', session.user.id)
		.order('fecha_prestamo', { ascending: false });

	if (error) {
		contenedor.innerHTML = '<p class="text-center text-danger py-4">Error al cargar tus préstamos.</p>';
		return;
	}

	if (!prestamos || prestamos.length === 0) {
		contenedor.innerHTML = '<p class="text-center text-muted py-4">Aún no tienes préstamos registrados.</p>';
		return;
	}

	const hoy = new Date();

	contenedor.innerHTML = prestamos.map(p => {
		const libro = p.libros;
		const fechaLimite = new Date(p.fecha_devolucion_esperada);
		let estadoClase = 'activo';
		let estadoTexto = 'Activo';
		let multaHtml = '';

		if (p.estado === 'devuelto') {
			estadoClase = 'devuelto';
			estadoTexto = 'Devuelto';
		} else if (hoy > fechaLimite) {
			estadoClase = 'vencido';
			estadoTexto = 'Vencido';

			const diasRetraso = Math.ceil((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
			const multaEstimada = diasRetraso * montoMultaPorDia;
			multaHtml = `<p class="prestamo-multa"><i class="bi bi-exclamation-triangle"></i> ${diasRetraso} día(s) de retraso · Multa estimada: $${multaEstimada.toLocaleString('es-CO')} COP</p>`;
		}

		return `
			<div class="prestamo-item">
				<img src="${libro?.portada_url || 'images/product-item1.jpg'}" alt="${libro?.titulo || ''}">
				<div class="prestamo-info">
					<h6>${libro?.titulo || 'Libro no disponible'}</h6>
					<p>${libro?.autor || ''} · Retiro: ${formatearFecha(new Date(p.fecha_prestamo))}</p>
					<p>Devolución límite: ${formatearFecha(fechaLimite)}</p>
					<span class="prestamo-estado ${estadoClase}">${estadoTexto}</span>
					${multaHtml}
				</div>
			</div>
		`;
	}).join('');
}
document.querySelector('#btnMisPrestamos').addEventListener('click', (e) => {
	e.preventDefault();
	bootstrap.Modal.getInstance(document.querySelector('#modalCuenta')).hide();

	setTimeout(() => {
		const modal = new bootstrap.Modal(document.querySelector('#modalMisPrestamos'));
		modal.show();
		cargarMisPrestamos();
	}, 300); // pequeño delay para que cierre el modal anterior primero
});