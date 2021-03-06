const array = Float32Array; // change to Float64Array if needed

class STFT {

    constructor(windowSize = 1024, fftSize = 1024,
        hopSize = 512, sampleRate = 44100, windowType = dsp.DSP.HANN, alpha = undefined) {
        this.windowSize = windowSize;
        this.fftSize = fftSize;
        this.hopSize = hopSize;
        this.sampleRate = sampleRate;
        this.window = new dsp.WindowFunction(windowType, alpha);
        this.fft = new dsp.FFT(fftSize, this.sampleRate);
        this.prevRaw = new array(this.fftSize); // previous unprocessed buffer
        this.prevProcessed = new array(this.fftSize); // previous buffer after processing
    }

    magnitude(real, imag) {
        return real.map((val, i) =>
            Math.sqrt(Math.pow(val, 2) +
                Math.pow(imag[i], 2))
        );
    }

    phase(real, imag) {
        return real.map((val, i) =>
            Math.atan(imag[i] / real[i])
        );
    }

    overlapAdd(buffer, processFunc) {
        let overlapWindow = new Float32Array(this.fftSize);
        overlapWindow.set(
            this.prevRaw.slice(this.hopSize, this.fftSize)
        );
        overlapWindow.set(
            buffer.slice(0, this.hopSize),
            this.hopSize
        );
        overlapWindow = this.window.process(overlapWindow);
        this.fft.forward(overlapWindow);

        let overlapProcessed = processFunc(this.fft.real, this.fft.imag);
        overlapWindow = this.fft.inverse(
            overlapProcessed.real, overlapProcessed.imag
        );

        let currentWindow = buffer.slice(0, this.fftSize);
        currentWindow = this.window.process(currentWindow);
        this.fft.forward(currentWindow);

        let currentProcessed = processFunc(this.fft.real, this.fft.imag);
        let currentResult = this.fft.inverse(currentProcessed.real, currentProcessed.imag);

        // return the result of the previous window plus overlap
        let result = new Float32Array(this.fftSize);
        result.set(this.prevProcessed);
        for (let i = 0; i < this.hopSize; i++) {
            result[i + this.hopSize] += overlapWindow[i];
        }
        // store overlap for future
        this.prevProcessed = currentResult;
        for (let i = 0; i < this.hopSize; i++) {
            this.prevProcessed[i] += overlapWindow[i + this.hopSize];
        }
        this.prevRaw = array;
        return result;
    }

    processSegment(buffer, processFunc) {
        this.fft.forward(buffer);
        processFunc(this.fft.real, this.fft.imag);
        //return this.fft.inverse(this.fft.real, this.fft.imag);
    }

    analyze(buffer, processFunc = this.magnitude, maxHops = 100000) {
        this.processFunc = processFunc;
        let frames = [];
        let arrayHops = Math.floor(
            (buffer.length - this.windowSize) / parseFloat(this.windowSize - this.hopSize)
        ) + 1;
        let numHops = Math.min(arrayHops, maxHops);
        let size = Math.round(this.fftSize / 2) + 1;
        for (let n = 0; n < numHops; n++) {
            let start = n * (this.windowSize - this.hopSize);
            let end = start + this.windowSize;

            let windowed = this.window.process(buffer.slice(start, end));
            var len_buffer = windowed.length;
            for (var i = 0; i < Math.floor((this.fftSize - len_buffer) / 2); i++) {
                windowed.unshift(0);
            }
            for (var i = 0; i < Math.floor((this.fftSize - len_buffer) / 2); i++) {
                windowed.push(0);
            }
            if (windowed.length < this.fftSize) {
                windowed.push(0);
            }

            this.processSegment(windowed,
                (real, imag) => {
                    let mag = this.processFunc(real, imag);
                    frames.push(mag.slice(0, size));
                });
        }
        return frames;
    }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    dsp = require('dsp.js');
    module.exports = STFT;
} else {
    dsp = {
        DSP: DSP,
        DFT: DFT,
        FFT: FFT,
        RFFT: RFFT,
        Sampler: Sampler,
        Oscillator: Oscillator,
        ADSR: ADSR,
        IIRFilter: IIRFilter,
        IIRFilter2: IIRFilter2,
        WindowFunction: WindowFunction,
        sinh: sinh,
        Biquad: Biquad,
        GraphicalEq: GraphicalEq,
        MultiDelay: MultiDelay,
        SingleDelay: SingleDelay,
        Reverb: Reverb
    };
}
