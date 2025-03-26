// Global Variables
let startTime = null;
let measurements = [];
let timerInterval = null;
let isTimerRunning = false;
let cycleTime = 0;
let samplesPerCycle = 0;
let currentCycle = 0;
let currentSample = 0;
let cycleInterval = null;

// Timer Variables
let totalStartTime = null;
let totalTimerInterval = null;
let isTotalTimerRunning = false;

// Initialize Charts
const phChart = new Chart(document.getElementById('ph-chart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'pH Level',
            data: [],
            borderColor: '#0ea5e9',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4,
            fill: false
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 14,
                ticks: {
                    stepSize: 2
                }
            }
        }
    }
});

const tdsChart = new Chart(document.getElementById('tds-chart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'TDS Level',
            data: [],
            borderColor: '#059669',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4,
            fill: false
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 1000,
                ticks: {
                    stepSize: 200
                }
            }
        }
    }
});

// Timer Functions
function updateTimer(startTime) {
    if (!startTime) return;
    
    const now = Date.now();
    const elapsed = now - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    document.getElementById('total-timer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function toggleTimer() {
    if (!isTotalTimerRunning) {
        totalStartTime = totalStartTime || Date.now();
        totalTimerInterval = setInterval(() => updateTimer(totalStartTime), 1000);
        document.getElementById('total-timer-toggle').textContent = 'Stop';
        document.getElementById('total-timer-toggle').classList.remove('btn-primary');
        document.getElementById('total-timer-toggle').classList.add('btn-danger');
    } else {
        clearInterval(totalTimerInterval);
        document.getElementById('total-timer-toggle').textContent = 'Start';
        document.getElementById('total-timer-toggle').classList.remove('btn-danger');
        document.getElementById('total-timer-toggle').classList.add('btn-primary');
    }
    isTotalTimerRunning = !isTotalTimerRunning;
}

function resetTimer() {
    clearInterval(totalTimerInterval);
    totalStartTime = null;
    isTotalTimerRunning = false;
    document.getElementById('total-timer').textContent = '00:00:00';
    document.getElementById('total-timer-toggle').textContent = 'Start';
    document.getElementById('total-timer-toggle').classList.remove('btn-danger');
    document.getElementById('total-timer-toggle').classList.add('btn-primary');
}

// Cycle Functions
function startCycle() {
    cycleTime = parseInt(document.getElementById('cycle-time').value) * 1000;
    samplesPerCycle = parseInt(document.getElementById('samples-per-cycle').value);
    
    if (!cycleTime || !samplesPerCycle) {
        alert('Please enter valid cycle time and samples per cycle');
        return;
    }
    
    currentCycle = 1;
    currentSample = 0;
    startTimer();
    takeSample();
    
    document.getElementById('start-cycle').disabled = true;
    document.getElementById('cycle-time').disabled = true;
    document.getElementById('samples-per-cycle').disabled = true;
    
    updateCycleInfo();
}

function takeSample() {
    const cycleTime = parseInt(document.getElementById('cycle-time').value) * 1000;
    const samplesPerCycle = parseInt(document.getElementById('samples-per-cycle').value);
    const currentCycle = parseInt(document.getElementById('current-cycle').textContent);
    const currentSample = parseInt(document.getElementById('current-sample').textContent) + 1;
    
    // Take before filtration reading first
    const beforePh = generateReading(7.0, 1.0); // More variation for dirty water
    const beforeTds = generateReading(800, 200); // Higher base TDS for dirty water
    
    addMeasurement(currentCycle, currentSample, beforePh, beforeTds, 'before filtration');
    
    // After a short delay, take the filtered reading
    setTimeout(() => {
        const afterPh = generateReading(7.0, 0.5); // Less variation for clean water
        const afterTds = generateReading(500, 100); // Lower base TDS for clean water
        
        addMeasurement(currentCycle, currentSample, afterPh, afterTds, `sample ${currentSample} at cycle ${currentCycle}`);
        
        // Update cycle info
        document.getElementById('current-sample').textContent = currentSample;
        document.getElementById('total-samples').textContent = 
            parseInt(document.getElementById('total-samples').textContent) + 2; // +2 because we take 2 readings
        
        // Schedule next sample or cycle
        if (currentSample < samplesPerCycle) {
            setTimeout(takeSample, cycleTime / samplesPerCycle);
        } else {
            document.getElementById('current-cycle').textContent = currentCycle + 1;
            document.getElementById('current-sample').textContent = 0;
            setTimeout(takeSample, cycleTime / samplesPerCycle);
        }
    }, 2000); // 2 second delay between readings
}

function generateReading(baseValue, variation) {
    return (baseValue + (Math.random() * 2 - 1) * variation).toFixed(2);
}

function addMeasurement(cycle, sample, ph, tds, status, timerValue) {
    const timestamp = new Date().toLocaleTimeString();
    const measurement = {
        cycle,
        sample,
        timestamp,
        timerValue,
        ph: parseFloat(ph).toFixed(2),
        tds: parseFloat(tds).toFixed(2),
        status
    };
    
    const measurements = getMeasurements();
    measurements.push(measurement);
    localStorage.setItem('measurements', JSON.stringify(measurements));
    
    updateCharts();
    updateTable();
}

function getMeasurements() {
    return JSON.parse(localStorage.getItem('measurements') || '[]');
}

function updateCycleInfo() {
    document.getElementById('current-cycle').textContent = currentCycle;
    document.getElementById('current-sample').textContent = currentSample;
    document.getElementById('total-samples').textContent = measurements.length;
}

function updateCharts() {
    const measurements = getMeasurements();
    const lastMeasurement = measurements[measurements.length - 1];
    
    if (!lastMeasurement) return;
    
    // Update pH Chart
    phChart.data.labels.push(lastMeasurement.timerValue || '00:00:00');
    phChart.data.datasets[0].data.push(lastMeasurement.ph);
    
    // Update TDS Chart
    tdsChart.data.labels.push(lastMeasurement.timerValue || '00:00:00');
    tdsChart.data.datasets[0].data.push(lastMeasurement.tds);
    
    // Keep only last 10 points
    if (phChart.data.labels.length > 10) {
        phChart.data.labels.shift();
        phChart.data.datasets[0].data.shift();
        tdsChart.data.labels.shift();
        tdsChart.data.datasets[0].data.shift();
    }
    
    // Update chart configurations
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Value'
                }
            }
        }
    };

    // pH specific options
    phChart.options = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: {
                beginAtZero: true,
                max: 14,
                ticks: {
                    stepSize: 1
                },
                title: {
                    display: true,
                    text: 'pH Level'
                }
            }
        }
    };

    // TDS specific options
    tdsChart.options = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: {
                beginAtZero: true,
                max: 1000,
                ticks: {
                    stepSize: 100
                },
                title: {
                    display: true,
                    text: 'TDS Level (ppm)'
                }
            }
        }
    };
    
    phChart.update('none');
    tdsChart.update('none');
}

function getStatus(ph, tds, status) {
    if (status === 'before filtration') {
        return '<span class="status-warning">Before Filtration</span>';
    }
    
    const phValue = parseFloat(ph);
    const tdsValue = parseFloat(tds);
    
    if (phValue >= 6.5 && phValue <= 8.5 && tdsValue <= 500) {
        return '<span class="status-success">' + status + '</span>';
    } else if (phValue >= 6.0 && phValue <= 9.0 && tdsValue <= 1000) {
        return '<span class="status-warning">' + status + '</span>';
    } else {
        return '<span class="status-danger">' + status + '</span>';
    }
}

function updateTable() {
    const tbody = document.querySelector('#data-table tbody');
    tbody.innerHTML = '';
    
    const measurements = getMeasurements();
    const sortedMeasurements = [...measurements].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    sortedMeasurements.forEach(measurement => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${measurement.timerValue || '00:00:00'}</td>
            <td>${measurement.ph}</td>
            <td>${measurement.tds}</td>
            <td>${getStatus(measurement.ph, measurement.tds, measurement.status)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Event Listeners
document.getElementById('total-timer-toggle').addEventListener('click', toggleTimer);
document.getElementById('total-timer-reset').addEventListener('click', resetTimer);
document.getElementById('increment-cycle').addEventListener('click', () => incrementCounter('cycle'));
document.getElementById('increment-sample').addEventListener('click', () => incrementCounter('sample'));
document.getElementById('decrement-cycle').addEventListener('click', () => decrementCounter('cycle'));
document.getElementById('decrement-sample').addEventListener('click', () => decrementCounter('sample'));
document.getElementById('export-ph').addEventListener('click', () => exportChart('ph-chart', 'ph_graph.png'));
document.getElementById('export-tds').addEventListener('click', () => exportChart('tds-chart', 'tds_graph.png'));
document.getElementById('save-reading').addEventListener('click', saveReading);
document.getElementById('send-arduino').addEventListener('click', sendToArduino);
document.getElementById('export-csv').addEventListener('click', exportToCSV);
document.getElementById('clear-data').addEventListener('click', clearData);

// Initialize
updateTimer(totalStartTime);
updateTable();

// Counter Functions
function incrementCounter(type) {
    const element = document.getElementById(`${type}-number`);
    const currentValue = parseInt(element.textContent);
    element.textContent = currentValue + 1;
}

function decrementCounter(type) {
    const element = document.getElementById(`${type}-number`);
    const currentValue = parseInt(element.textContent);
    if (currentValue > 0) {
        element.textContent = currentValue - 1;
    }
}

// Reading Functions
function calculateAverage(inputs) {
    const values = Array.from(inputs)
        .map(input => parseFloat(input.value))
        .filter(value => !isNaN(value));
    
    if (values.length === 0) return 0;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
}

function updateAverages() {
    const phInputs = document.querySelectorAll('.ph-input');
    const tdsInputs = document.querySelectorAll('.tds-input');
    
    document.getElementById('ph-average').textContent = calculateAverage(phInputs);
    document.getElementById('tds-average').textContent = calculateAverage(tdsInputs);
}

function clearInputs() {
    document.querySelector('.ph-input').value = '';
    document.querySelector('.tds-input').value = '';
}

function saveReading() {
    const cycle = parseInt(document.getElementById('cycle-number').textContent);
    const sample = parseInt(document.getElementById('sample-number').textContent);
    const ph = parseFloat(document.querySelector('.ph-input').value);
    const tds = parseFloat(document.querySelector('.tds-input').value);
    const timerValue = document.getElementById('total-timer').textContent;
    
    if (isNaN(ph) || isNaN(tds)) {
        alert('Please enter valid readings');
        return;
    }
    
    const status = cycle === 0 ? `Sample ${sample} before filtration` : `Sample ${sample} at cycle ${cycle}`;
    addMeasurement(cycle, sample, ph, tds, status, timerValue);
    clearInputs();
}

async function sendToArduino() {
    try {
        const measurements = getMeasurements();
        const lastMeasurement = measurements[measurements.length - 1];
        if (!lastMeasurement) {
            alert('No data available to send');
            return;
        }
        
        const response = await fetch('http://localhost:3000/arduino', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ph: lastMeasurement.ph,
                tds: lastMeasurement.tds
            })
        });
        
        if (!response.ok) throw new Error('Connection failed');
        alert('Data sent successfully');
    } catch (error) {
        alert('Error sending data: ' + error.message);
    }
}

function exportToCSV() {
    const measurements = getMeasurements();
    if (measurements.length === 0) {
        alert('No data available to export');
        return;
    }
    
    const headers = ['Timer', 'pH', 'TDS', 'Status'];
    const csvContent = [
        headers.join(','),
        ...measurements.map(m => [
            m.timerValue || '00:00:00',
            m.ph,
            m.tds,
            m.status
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'water_quality_data.csv';
    link.click();
}

function clearData() {
    if (confirm('Are you sure you want to clear all data?')) {
        localStorage.removeItem('measurements');
        updateCharts();
        updateTable();
    }
}

function exportChart(chartId, filename) {
    const canvas = document.getElementById(chartId);
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
} 