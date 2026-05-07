import express from 'express';
import morgan from 'morgan';
import { engine } from 'express-handlebars';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import personasRoutes from './routes/personas.routes.js';
import session from 'express-session';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.set('port', 3000);
app.set('views', join(__dirname, 'views'));

app.engine('.hbs', engine({
    defaultLayout: 'main',
    layoutsDir: join(app.get('views'), 'layouts'),
    partialsDir: join(app.get('views'), 'partials'),
    extname: '.hbs',
    helpers: {
        ifCond: function (v1, v2, options) {
            if (v1 == v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        },
        formatDate: function (date) {
            return new Date(date).toLocaleDateString('es-CO');
        }
    }
}));

app.set('view engine', '.hbs');

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/*  SESIONES VAN AQUÍ */
app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: false
}));

// Hacer disponible el usuario en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

/*  DESPUÉS VAN LAS RUTAS */
app.get('/', (req, res) => {
    res.render('index');
});

app.use(personasRoutes);

app.use(express.static(join(__dirname, 'public')));

app.listen(app.get('port'), () => {
    console.log('Server listening on port', app.get('port'));
});