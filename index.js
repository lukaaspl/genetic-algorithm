var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var GeneticAlgorithm = /** @class */ (function () {
    function GeneticAlgorithm(options) {
        this.fitnesses = [];
        this.searchSet = options.searchSet;
        this.populationCount = options.populationCount;
        this.mutationProbability = options.mutationProbability;
        this.crossingProbability = options.crossingProbability;
        this.generations = options.generations;
        this.population = this.initializePopulation();
        this.getFitness = this.generateAdaptationFunction(options.adaptationOptions);
    }
    GeneticAlgorithm.prototype.initializePopulation = function () {
        var _this = this;
        var population = __spreadArrays(new Array(this.populationCount)).map(function () {
            var _a = _this.searchSet, min = _a.min, max = _a.max;
            return new Chromosome(Utils.getRandomInteger(min, max));
        });
        return population;
    };
    GeneticAlgorithm.prototype.generateAdaptationFunction = function (adaptationOptions) {
        var pattern = adaptationOptions.pattern, factors = adaptationOptions.factors;
        var patternWithFactors = Object.keys(factors || []).reduce(function (acc, factor) {
            var regex = new RegExp("\\[" + factor + "\\]", "g");
            return acc.replace(regex, factors[factor].toString());
        }, pattern);
        return function (value) {
            var injectedPattern = patternWithFactors.replace(/\[x\]/g, value.toString());
            var result = eval(injectedPattern);
            return Utils.preventInfinity(result);
        };
    };
    GeneticAlgorithm.prototype.adaptChromosomes = function () {
        var _this = this;
        var fitnesses = this.population.map(function (chromosome) { return ({
            value: _this.getFitness(chromosome.asDecimal()),
            chromosome: chromosome
        }); });
        this.fitnesses = fitnesses;
    };
    GeneticAlgorithm.prototype.selectChromosomes = function () {
        var combinedSliceSize = 0;
        var totalFitness = this.fitnesses.reduce(function (sum, fitness) { return sum + fitness.value; }, 0);
        var rouletteSlices = this.fitnesses.map(function (fitness) {
            var sliceSize = (fitness.value / totalFitness) * 100;
            combinedSliceSize += sliceSize;
            return {
                chromosome: fitness.chromosome,
                threshold: combinedSliceSize
            };
        }, []);
        var selectedChromosomes = __spreadArrays(new Array(this.populationCount)).map(function () {
            var randomRoulettePercent = Utils.getRandomInteger(1, 100);
            var matchingSlice = rouletteSlices.find(function (_a, index) {
                var threshold = _a.threshold;
                var previousSlice = rouletteSlices[index - 1];
                var isFirstSlice = index === 0;
                var isLastSlice = index === rouletteSlices.length - 1;
                return Utils.isBetween(randomRoulettePercent, isFirstSlice ? 0 : previousSlice.threshold, isLastSlice ? 100 : threshold);
            });
            return matchingSlice.chromosome;
        });
        this.population = selectedChromosomes;
    };
    GeneticAlgorithm.prototype.crossChromosomes = function () {
        var _this = this;
        var pairedChromosomes = this.population.reduce(function (pairs, chromosome, index) {
            var isIndexOdd = index % 2 !== 0;
            var nextChromosome = _this.population[index + 1];
            if (isIndexOdd) {
                return pairs;
            }
            return __spreadArrays(pairs, [[chromosome].concat(nextChromosome || [])]);
        }, []);
        var crossedChromosomes = pairedChromosomes
            .map(function (pair) {
            var isPair = pair.length === 2;
            var crossingDisabled = Math.random() > _this.crossingProbability;
            if (isPair && !crossingDisabled) {
                var firstChromosome = pair[0], secondChromosome = pair[1];
                var largestPossibleCrossingPoint = Math.min(firstChromosome.getLength(), secondChromosome.getLength()) - 1;
                var crossingPoint_1 = Utils.getRandomInteger(1, largestPossibleCrossingPoint);
                var cross = function (ch1, ch2) {
                    return new Chromosome(ch1.asBinary().substr(0, crossingPoint_1) +
                        ch2.asBinary().substr(crossingPoint_1));
                };
                return [
                    cross(firstChromosome, secondChromosome),
                    cross(secondChromosome, firstChromosome),
                ];
            }
            return pair;
        })
            .flat();
        this.population = crossedChromosomes;
    };
    GeneticAlgorithm.prototype.mutateChromosomes = function () {
        var _this = this;
        var mutatedChromosomes = this.population.map(function (chromosome) {
            var mutationDisabled = Math.random() > _this.mutationProbability;
            if (mutationDisabled) {
                return chromosome;
            }
            var mutationPoint = Utils.getRandomInteger(0, chromosome.getLength());
            var mutatedValue = chromosome.asBinary().charAt(mutationPoint) === "0" ? "1" : "0";
            return new Chromosome(chromosome
                .asBinary()
                .split("")
                .map(function (value, index) {
                return index === mutationPoint ? mutatedValue : value;
            })
                .join(""));
        });
        this.population = mutatedChromosomes;
    };
    GeneticAlgorithm.prototype.getGreatestFitness = function () {
        return this.fitnesses.reduce(function (greatestFitness, fitness) {
            return fitness.value > greatestFitness.value ? fitness : greatestFitness;
        }, this.fitnesses[0]);
    };
    GeneticAlgorithm.prototype.evolve = function () {
        this.adaptChromosomes();
        this.selectChromosomes();
        this.crossChromosomes();
        this.mutateChromosomes();
    };
    GeneticAlgorithm.prototype.startEvolution = function () {
        console.clear();
        var printResult = function (generation, fitness) {
            var chromosome = fitness.chromosome, value = fitness.value;
            console.log(generation + " generation: Maximum was found for x = " + chromosome.asDecimal() + " and it is " + value);
        };
        for (var i = 1; i <= this.generations; i++) {
            this.evolve();
            if (!(i % 10) && i !== this.generations) {
                printResult(i, this.getGreatestFitness());
            }
        }
        printResult(this.generations, this.getGreatestFitness());
    };
    return GeneticAlgorithm;
}());
var Chromosome = /** @class */ (function () {
    function Chromosome(value) {
        this.value = value;
    }
    Chromosome.prototype.asBinary = function () {
        return typeof this.value === "string"
            ? this.value
            : (this.value >>> 0).toString(2);
    };
    Chromosome.prototype.asDecimal = function () {
        return typeof this.value === "number"
            ? this.value
            : parseInt(this.value, 2);
    };
    Chromosome.prototype.getLength = function () {
        return this.asBinary().length;
    };
    return Chromosome;
}());
var Utils = /** @class */ (function () {
    function Utils() {
    }
    Utils.getRandomInteger = function (min, max) {
        return Math.trunc(Math.random() * (max - min + 1)) + min;
    };
    Utils.isBetween = function (number, min, max) {
        return number >= min && number <= max;
    };
    Utils.preventInfinity = function (number) {
        return Number.isFinite(number)
            ? number
            : number === Infinity
                ? Number.MAX_VALUE
                : Number.MIN_VALUE;
    };
    return Utils;
}());
var linearGeneticAlgorithm = new GeneticAlgorithm({
    adaptationOptions: {
        pattern: "2 * [x] + 1"
    },
    searchSet: { min: 0, max: 31 },
    populationCount: 8,
    generations: 1000,
    crossingProbability: 0.75,
    mutationProbability: 0.2
});
var nonLinearGeneticAlgorithm = new GeneticAlgorithm({
    adaptationOptions: {
        pattern: "([A] * Math.cos([x] + 3)) + ([B] * (Math.log([x]))) + [C]",
        factors: {
            A: 6,
            B: 0,
            C: 0
        }
    },
    searchSet: { min: 0, max: 255 },
    populationCount: 20,
    generations: 1000,
    crossingProbability: 0.75,
    mutationProbability: 0.2
});
document
    .getElementById("linear")
    .addEventListener("click", function () { return linearGeneticAlgorithm.startEvolution(); });
document
    .getElementById("nonLinear")
    .addEventListener("click", function () { return nonLinearGeneticAlgorithm.startEvolution(); });
