import express from 'express';
import cors from 'cors';
import evalsRouter from './evals';
import reportsRouter from './reports';
import vulnerabilitiesRouter from './vulnerabilities';
// ... other imports

const app = express();

app.use(cors());
app.use(express.json());

// Existing routes
app.use('/api/evals', evalsRouter);
app.use('/api/reports', reportsRouter);

// New vulnerabilities route
app.use('/api/vulnerabilities', vulnerabilitiesRouter);

// ... rest of the file