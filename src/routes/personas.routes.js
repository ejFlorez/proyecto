import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

const isLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', async (req, res) => {
  const { numeroid, password } = req.body;

  const [rows] = await pool.query(
    'SELECT * FROM pacientes WHERE numeroid = ?',
    [numeroid]
  );

  if (rows.length === 0) {
    return res.render('login', { error: 'El número de identificación es incorrecto' });
  }

  if (rows[0].password !== password) {
    return res.render('login', { error: 'La contraseña ingresada es incorrecta' });
  }

  req.session.user = rows[0];
  res.redirect('/');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// FORMULARIO
router.get('/citas/add', isLoggedIn, async (req, res) => {
    res.render('citas/add');
});

// GUARDAR
router.post('/citas/add', isLoggedIn, async (req, res) => {
    try {
        const { especialidad, fecha, hora } = req.body;

        // Validación: no se permiten fechas pasadas
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaCita = new Date(fecha + 'T00:00:00');
        if (fechaCita < hoy) {
            return res.render('citas/add', {
                error: 'No puedes agendar una cita en una fecha que ya pasó. Por favor selecciona una fecha válida.'
            });
        }

        // Validación de horario de atención (8:00 - 18:00)
        const [horaNum, minNum] = hora.split(':').map(Number);
        const minutosCita = horaNum * 60 + minNum;
        if (minutosCita < 8 * 60 || minutosCita > 18 * 60) {
            return res.render('citas/add', {
                error: 'El horario de atención es de 8:00 AM a 6:00 PM.'
            });
        }

        // Si es hoy, la hora no puede ser anterior a la hora actual
        const fechaHoraActual = new Date();
        const fechaCitaCompleta = new Date(`${fecha}T${hora}`);
        if (fechaCita.getTime() === hoy.getTime() && fechaCitaCompleta < fechaHoraActual) {
            return res.render('citas/add', {
                error: 'La hora seleccionada ya pasó. Por favor elige una hora disponible.'
            });
        }

        await pool.query(
            'INSERT INTO citas (paciente_id, especialidad, fecha, hora) VALUES (?, ?, ?, ?)',
            [req.session.user.id, especialidad, fecha, hora]
        );

        res.redirect('/citas/list');
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/citas/list', isLoggedIn, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT citas.*, pacientes.name
            FROM citas
            INNER JOIN pacientes 
            ON citas.paciente_id = pacientes.id
            WHERE citas.paciente_id = ?
        `, [req.session.user.id]);

        const citas = rows.map(cita => ({
            ...cita,
            fecha: new Date(cita.fecha).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/Bogota'
            })
        }));

        res.render('citas/list', { citas });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/citas/edit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;

    const [cita] = await pool.query(
        'SELECT * FROM citas WHERE id = ? AND paciente_id = ?',
        [id, req.session.user.id]
    );

    if (cita.length === 0) return res.redirect('/citas/list');

    res.render('citas/edit', {
        cita: cita[0]
    });
});

router.post('/citas/edit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const { especialidad, fecha, hora } = req.body;

    // Validación: no se permiten fechas pasadas
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaCita = new Date(fecha + 'T00:00:00');
    if (fechaCita < hoy) {
        const [cita] = await pool.query(
            'SELECT * FROM citas WHERE id = ? AND paciente_id = ?',
            [id, req.session.user.id]
        );
        return res.render('citas/edit', {
            cita: cita[0],
            error: 'No puedes agendar una cita en una fecha que ya pasó. Por favor selecciona una fecha válida.'
        });
    }

    // Validación de horario de atención (8:00 - 18:00)
    const [horaNum, minNum] = hora.split(':').map(Number);
    const minutosCita = horaNum * 60 + minNum;
    if (minutosCita < 8 * 60 || minutosCita > 18 * 60) {
        const [cita] = await pool.query(
            'SELECT * FROM citas WHERE id = ? AND paciente_id = ?',
            [id, req.session.user.id]
        );
        return res.render('citas/edit', {
            cita: cita[0],
            error: 'El horario de atención es de 8:00 AM a 6:00 PM.'
        });
    }

    // Si es hoy, la hora no puede ser anterior a la hora actual
    const fechaHoraActual = new Date();
    const fechaCitaCompleta = new Date(`${fecha}T${hora}`);
    if (fechaCita.getTime() === hoy.getTime() && fechaCitaCompleta < fechaHoraActual) {
        const [cita] = await pool.query(
            'SELECT * FROM citas WHERE id = ? AND paciente_id = ?',
            [id, req.session.user.id]
        );
        return res.render('citas/edit', {
            cita: cita[0],
            error: 'La hora seleccionada ya pasó. Por favor elige una hora disponible.'
        });
    }

    await pool.query(
        'UPDATE citas SET especialidad = ?, fecha = ?, hora = ? WHERE id = ? AND paciente_id = ?',
        [especialidad, fecha, hora, id, req.session.user.id]
    );

    res.redirect('/citas/list');
});

router.get('/citas/delete/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'DELETE FROM citas WHERE id = ? AND paciente_id = ?',
            [id, req.session.user.id]
        );

        res.redirect('/citas/list');
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/pacientes', (req, res) => {
    res.render('pacientes/addp');
});

router.get('/pacientes/addp', (req, res) => {
    res.render('pacientes/addp');
});

router.post('/pacientes/addp', async (req, res) => {
  const { name, numeroid, age, password } = req.body;

  const MAX_NUMEROID = 9999999999n;
  const numId = BigInt(numeroid);

  if (numId > MAX_NUMEROID) {
    return res.render('pacientes/addp', {
      error: 'El número de identificación excede el límite de 10 dígitos permitidos.'
    });
  }

  // Validación: verificar si el número de identificación ya existe
  const [existe] = await pool.query(
    'SELECT id FROM pacientes WHERE numeroid = ?',
    [numeroid]
  );

  if (existe.length > 0) {
    return res.render('pacientes/addp', {
      error: 'Ya existe un usuario registrado con ese número de identificación.'
    });
  }

  await pool.query(
    'INSERT INTO pacientes (name, numeroid, age, password) VALUES (?, ?, ?, ?)',
    [name, numeroid, age, password.trim()]
  );
  res.redirect('/login');
});

export default router;