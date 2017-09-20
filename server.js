const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const {
    DATABASE_URL,
    PORT
} = require('./config');
const {
    Reflection
} = require('./models');

const app = express();

app.use(express.static('public'));
app.use(morgan('common'));
app.use(bodyParser.json());


//retrieve all reflections from the database
app.get('/reflections', (req, res) => {
    Reflection
        .find()
        .then(reflections => {
            res.json(reflections);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: 'something went wrong'
            });
        })
});

//retrieve reflection by id
app.get('/reflections/:id', (req, res) => {
    Reflection
        .findById(req.params.id)
        .then(reflections => res.json(reflections))
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: 'something went wrong'
            });
        });
});

//post a new reflection

app.post('/reflections/new', (req, res) => {
    const requiredFields = ['date', 'location', 'mood', 'text'];
    for (let i = 0; i < requiredFields.lenth; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing \`${field}\` in request body`
            console.error(message);
            return res.status(400).send(message);
        }
    }

    Reflection
        .create({
            location: req.body.location,
            mood: req.body.mood,
            text: req.body.text,
            date: req.body.date,
        })
        .then(reflection => res.status(201).json(reflection))
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: 'Something went wrong'
            });
        });
});

app.put('/reflections/:id', jsonParser, (req, res) => {
    if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
        res.status(400).json({
            error: 'Request path id and request body id values must match'
        });
    }

    const updated = {};
    const updateableFields = ['date', 'location', 'mood', 'text'];
    updateableFields.forEach(field => {
        if (field in req.body) {
            updated[field] = req.body[field];
        }
    });

    Reflection
        .findByIdAndUpdate(req.params.id, {
            $set: updated
        }, {
            new: true
        })
        .then(updatedReflection => res.status(204).end())
        .catch(err => res.status(500).json({
            message: 'Something went wrong'
        }));
});


app.delete('/reflections/:id', (req, res) => {
    Reflection
        .findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(204).json({
                message: 'success'
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: 'Something went wrong'
            });
        });
})


let server;

function runServer(databaseUrl = DATABASE_URL, port = PORT) {
    return new Promise((resolve, reject) => {
        mongoose.connect(databaseUrl, err => {
            if (err) {
                return reject(err);
            }
            server = app.listen(port, () => {
                    console.log(`Your app is listening on port ${port}`);
                    resolve();
                })
                .on('error', err => {
                    mongoose.disconnect();
                    reject(err);
                });
        });
    });
}

function closeServer() {
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing server');
            server.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

if (require.main === module) {
    runServer().catch(err => console.error(err));
};

module.exports = {
    runServer,
    app,
    closeServer
};
