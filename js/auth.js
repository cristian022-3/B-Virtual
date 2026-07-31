let modoRegistro = false;
let sesionActiva = null;

document.querySelector('#btnAbrirLogin').addEventListener('click', async () => {
	if (sesionActiva) {
		// Ya hay sesión: mostrar menú de cuenta en vez de login
		const modalCuenta = new bootstrap.Modal(document.querySelector('#modalCuenta'));
		modalCuenta.show();
	} else {
		const modal = new bootstrap.Modal(document.querySelector('#modalAuth'));
		modal.show();
	}
});

document.querySelector('#toggleAuthMode').addEventListener('click', (e) => {
	e.preventDefault();
	modoRegistro = !modoRegistro;

	document.querySelector('#authModalTitulo').textContent = modoRegistro ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
	document.querySelector('#authModalSubtitulo').textContent = modoRegistro
		? 'Regístrate para empezar a pedir libros prestados'
		: 'Inicia sesión para gestionar tus préstamos';

	document.querySelector('#btnAuthSubmit').textContent = modoRegistro ? 'Crear cuenta' : 'Iniciar sesión';
	document.querySelector('#authNombreWrap').classList.toggle('d-none', !modoRegistro);
	document.querySelector('#authConsentimientoWrap').classList.toggle('d-none', !modoRegistro);
	document.querySelector('#checkConsentimientoRegistro').checked = false;

	document.querySelector('#authToggleTextoBase').textContent = modoRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
	e.target.textContent = modoRegistro ? 'Inicia sesión' : 'Regístrate aquí';
});

document.querySelector('#btnAuthSubmit').addEventListener('click', async () => {
    const email = document.querySelector('#authEmail').value.trim();
    const password = document.querySelector('#authPassword').value;
    const nombre = document.querySelector('#authNombre').value.trim();
    const errorBox = document.querySelector('#authError');
    errorBox.classList.add('d-none');

    if (!email || !password) {
        errorBox.textContent = 'Completa correo y contraseña.';
        errorBox.classList.remove('d-none');
        return;
    }

    if (modoRegistro && !document.querySelector('#checkConsentimientoRegistro').checked) {
        errorBox.textContent = 'Debes aceptar la Política de Tratamiento de Datos Personales para registrarte.';
        errorBox.classList.remove('d-none');
        return;
    }

    let resultado;
    if (modoRegistro) {
        // Enviar el nombre en la metadata es una buena práctica en Supabase
        resultado = await supabaseClient.auth.signUp({ 
            email, 
            password,
            options: { data: { nombre: nombre } } 
        });
    } else {
        resultado = await supabaseClient.auth.signInWithPassword({ email, password });
    }

    if (resultado.error) {
        errorBox.textContent = resultado.error.message;
        errorBox.classList.remove('d-none');
        return;
    }

    if (modoRegistro && resultado.data.user) {
        const usuarioId = resultado.data.user.id;

        if (nombre) {
            // USAR UPSERT: Inserta el registro si no existe, lo actualiza si ya existe
            await supabaseClient.from('usuarios').upsert({ 
                id: usuarioId, 
                nombre: nombre,
                email: email 
            });
        }

        await supabaseClient.from('consentimientos').insert({
            usuario_id: usuarioId,
            tipo: 'datos_personales',
            user_agent: navigator.userAgent
        });
    }

    bootstrap.Modal.getInstance(document.querySelector('#modalAuth')).hide();
    actualizarEstadoSesion();
});

async function actualizarEstadoSesion() {
    // Obtenemos la sesión local
    const { data: { session } } = await supabaseClient.auth.getSession();
    const btnLogin = document.querySelector('#btnAbrirLogin');

    if (session) {
        // Buscar el nombre real en la tabla usuarios
        const { data: usuario, error } = await supabaseClient
            .from('usuarios')
            .select('nombre')
            .eq('id', session.user.id)
            .single();

        // Si hay un error (ej. el usuario fue borrado de la BD), destruimos la sesión local
        if (error || !usuario) {
            console.warn("Usuario no encontrado en BD. Limpiando sesión local.");
            await supabaseClient.auth.signOut();
            sesionActiva = null;
            btnLogin.textContent = 'Iniciar sesión';
            return; // Salimos de la función
        }

        // Si todo está correcto, asignamos la sesión activa
        sesionActiva = session;
        const nombreMostrar = usuario.nombre || session.user.email;
        btnLogin.textContent = `Hola, ${nombreMostrar}`;
        
        // Actualizamos el modal de la cuenta
        document.querySelector('#cuentaNombreUsuario').textContent = nombreMostrar;
        document.querySelector('#cuentaEmailUsuario').textContent = session.user.email;
        
        // LLAMADA AL ARCHIVO ADMIN.JS: Muestra el botón si es admin
        if (typeof actualizarVisibilidadAdmin === 'function') {
            await actualizarVisibilidadAdmin();
        }

    } else {
        // No hay sesión activa
        sesionActiva = null;
        btnLogin.textContent = 'Iniciar sesión';
        
        // LLAMADA AL ARCHIVO ADMIN.JS: Oculta el botón por seguridad
        if (typeof actualizarVisibilidadAdmin === 'function') {
            await actualizarVisibilidadAdmin();
        }
    }
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    await actualizarEstadoSesion(); // Añadí 'await' aquí para asegurar que todo se limpie bien antes de cerrar
    
    const modalCuentaEl = document.querySelector('#modalCuenta');
    if (modalCuentaEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalCuentaEl);
        if (modalInstance) {
            modalInstance.hide();
        }
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', actualizarEstadoSesion);