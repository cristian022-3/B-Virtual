function generarReciboPDF(datos) {
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF();

	const colorDorado = [116, 100, 47];
	const colorGris = [100, 100, 100];

	// Encabezado
	doc.setFillColor(...colorDorado);
	doc.rect(0, 0, 210, 30, 'F');
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(18);
	doc.setFont('helvetica', 'bold');
	doc.text('Biblioteca Virtual', 15, 18);
	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	doc.text('Recibo de préstamo', 15, 25);

	// Cuerpo
	doc.setTextColor(30, 30, 30);
	doc.setFontSize(12);
	doc.setFont('helvetica', 'bold');
	doc.text('Detalles del préstamo', 15, 45);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.setTextColor(...colorGris);

	let y = 55;
	const linea = (label, valor) => {
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(30, 30, 30);
		doc.text(label, 15, y);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...colorGris);
		doc.text(String(valor), 70, y);
		y += 8;
	};

	linea('N° de préstamo:', datos.prestamoId);
	linea('Usuario:', datos.usuarioEmail);
	linea('Libro:', datos.titulo);
	linea('Autor:', datos.autor);
	linea('Fecha de retiro:', datos.fechaRetiro);
	linea('Fecha límite de devolución:', datos.fechaDevolucion);
	linea('Multa por día de retraso:', `$${datos.montoMulta.toLocaleString('es-CO')} COP`);

	y += 5;
	doc.setDrawColor(220, 220, 220);
	doc.line(15, y, 195, y);
	y += 10;

	doc.setFontSize(9);
	doc.setTextColor(150, 150, 150);
	doc.text('Este documento es un comprobante de préstamo. Conserve este recibo hasta', 15, y);
	doc.text('la devolución del libro. Al aceptar el préstamo, usted se comprometió a', 15, y + 5);
	doc.text('devolver el libro antes de la fecha límite indicada.', 15, y + 10);

	doc.setFontSize(8);
	doc.setTextColor(180, 180, 180);
	doc.text(`Generado el ${new Date().toLocaleString('es-CO')}`, 15, 280);

	doc.save(`recibo-prestamo-${datos.prestamoId}.pdf`);
}