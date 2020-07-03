interface GAOptions {
  adaptationOptions: AdaptationOptions;
  searchSet: SearchSet;
  populationCount: number;
  generations: number;
  crossingProbability: number;
  mutationProbability: number;
}

interface SearchSet {
  min: number;
  max: number;
}

interface AdaptationOptions {
  pattern: string;
  factors?: Record<string, number>;
}

interface Fitness {
  chromosome: Chromosome;
  value: number;
}

class GeneticAlgorithm {
  private readonly searchSet: SearchSet;
  private readonly populationCount: number;
  private readonly crossingProbability: number;
  private readonly mutationProbability: number;
  private readonly generations: number;
  private fitnesses: Fitness[] = [];
  private population: Chromosome[];
  private getFitness: (value: number) => number;

  constructor(options: GAOptions) {
    this.searchSet = options.searchSet;
    this.populationCount = options.populationCount;
    this.mutationProbability = options.mutationProbability;
    this.crossingProbability = options.crossingProbability;
    this.generations = options.generations;
    this.population = this.initializePopulation();
    this.getFitness = this.generateAdaptationFunction(
      options.adaptationOptions
    );
  }

  private initializePopulation(): Chromosome[] {
    const population = [...new Array(this.populationCount)].map(() => {
      const { min, max } = this.searchSet;

      return new Chromosome(Utils.getRandomInteger(min, max));
    });

    return population;
  }

  private generateAdaptationFunction(
    adaptationOptions: AdaptationOptions
  ): (value: number) => number {
    const { pattern, factors } = adaptationOptions;

    const patternWithFactors = Object.keys(factors || []).reduce(
      (acc, factor) => {
        const regex = new RegExp(`\\[${factor}\\]`, "g");

        return acc.replace(regex, factors![factor].toString());
      },
      pattern
    );

    return (value: number) => {
      const injectedPattern = patternWithFactors.replace(
        /\[x\]/g,
        value.toString()
      );

      const result = eval(injectedPattern) as number;

      return Utils.preventInfinity(result);
    };
  }

  private adaptChromosomes(): void {
    const fitnesses = this.population.map((chromosome) => ({
      value: this.getFitness(chromosome.asDecimal()),
      chromosome,
    }));

    this.fitnesses = fitnesses;
  }

  private selectChromosomes(): void {
    let combinedSliceSize = 0;

    const totalFitness = this.fitnesses.reduce(
      (sum, fitness) => sum + fitness.value,
      0
    );

    const rouletteSlices = this.fitnesses.map((fitness) => {
      const sliceSize = (fitness.value / totalFitness) * 100;

      combinedSliceSize += sliceSize;

      return {
        chromosome: fitness.chromosome,
        threshold: combinedSliceSize,
      };
    }, []);

    const selectedChromosomes = [...new Array(this.populationCount)].map(() => {
      const randomRoulettePercent = Utils.getRandomInteger(1, 100);

      const matchingSlice = rouletteSlices.find(({ threshold }, index) => {
        const previousSlice = rouletteSlices[index - 1];
        const isFirstSlice = index === 0;
        const isLastSlice = index === rouletteSlices.length - 1;

        return Utils.isBetween(
          randomRoulettePercent,
          isFirstSlice ? 0 : previousSlice.threshold,
          isLastSlice ? 100 : threshold
        );
      });

      return matchingSlice!.chromosome;
    });

    this.population = selectedChromosomes;
  }

  private crossChromosomes(): void {
    const pairedChromosomes = this.population.reduce(
      (pairs, chromosome, index) => {
        const isIndexOdd = index % 2 !== 0;
        const nextChromosome = this.population[index + 1];

        if (isIndexOdd) {
          return pairs;
        }

        return [...pairs, [chromosome].concat(nextChromosome || [])];
      },
      [] as Chromosome[][]
    );

    const crossedChromosomes = pairedChromosomes
      .map((pair) => {
        const isPair = pair.length === 2;
        const crossingDisabled = Math.random() > this.crossingProbability;

        if (isPair && !crossingDisabled) {
          const [firstChromosome, secondChromosome] = pair;

          const largestPossibleCrossingPoint =
            Math.min(
              firstChromosome.getLength(),
              secondChromosome.getLength()
            ) - 1;

          const crossingPoint = Utils.getRandomInteger(
            1,
            largestPossibleCrossingPoint
          );

          const cross = (ch1: Chromosome, ch2: Chromosome) =>
            new Chromosome(
              ch1.asBinary().substr(0, crossingPoint) +
                ch2.asBinary().substr(crossingPoint)
            );

          return [
            cross(firstChromosome, secondChromosome),
            cross(secondChromosome, firstChromosome),
          ];
        }

        return pair;
      })
      .flat();

    this.population = crossedChromosomes;
  }

  private mutateChromosomes(): void {
    const mutatedChromosomes = this.population.map((chromosome) => {
      const mutationDisabled = Math.random() > this.mutationProbability;

      if (mutationDisabled) {
        return chromosome;
      }

      const mutationPoint = Utils.getRandomInteger(0, chromosome.getLength());
      const mutatedValue =
        chromosome.asBinary().charAt(mutationPoint) === "0" ? "1" : "0";

      return new Chromosome(
        chromosome
          .asBinary()
          .split("")
          .map((value, index) =>
            index === mutationPoint ? mutatedValue : value
          )
          .join("")
      );
    });

    this.population = mutatedChromosomes;
  }

  private getGreatestFitness(): Fitness {
    return this.fitnesses.reduce(
      (greatestFitness, fitness) =>
        fitness.value > greatestFitness.value ? fitness : greatestFitness,
      this.fitnesses[0]
    );
  }

  private evolve(): void {
    this.adaptChromosomes();
    this.selectChromosomes();
    this.crossChromosomes();
    this.mutateChromosomes();
  }

  public startEvolution(): void {
    console.clear();

    const printResult = (generation: number, fitness: Fitness) => {
      const { chromosome, value } = fitness;

      console.log(
        `${generation} generation: Maximum was found for x = ${chromosome.asDecimal()} and it is ${value}`
      );
    };

    for (let i = 1; i <= this.generations; i++) {
      this.evolve();

      if (!(i % 10) && i !== this.generations) {
        printResult(i, this.getGreatestFitness());
      }
    }

    printResult(this.generations, this.getGreatestFitness());
  }
}

class Chromosome {
  constructor(private value: number | string) {}

  asBinary(): string {
    return typeof this.value === "string"
      ? this.value
      : (this.value >>> 0).toString(2);
  }

  asDecimal(): number {
    return typeof this.value === "number"
      ? this.value
      : parseInt(this.value, 2);
  }

  getLength(): number {
    return this.asBinary().length;
  }
}

class Utils {
  static getRandomInteger(min: number, max: number): number {
    return Math.trunc(Math.random() * (max - min + 1)) + min;
  }

  static isBetween(number: number, min: number, max: number) {
    return number >= min && number <= max;
  }

  static preventInfinity(number: number) {
    return Number.isFinite(number)
      ? number
      : number === Infinity
      ? Number.MAX_VALUE
      : Number.MIN_VALUE;
  }
}

const linearGeneticAlgorithm = new GeneticAlgorithm({
  adaptationOptions: {
    pattern: "2 * [x] + 1",
  },
  searchSet: { min: 0, max: 31 },
  populationCount: 8,
  generations: 1000,
  crossingProbability: 0.75,
  mutationProbability: 0.2,
});

const nonLinearGeneticAlgorithm = new GeneticAlgorithm({
  adaptationOptions: {
    pattern: "([A] * Math.cos([x] + 3)) + ([B] * (Math.log([x]))) + [C]",
    factors: {
      A: 6,
      B: 0,
      C: 0,
    },
  },
  searchSet: { min: 0, max: 255 },
  populationCount: 20,
  generations: 1000,
  crossingProbability: 0.75,
  mutationProbability: 0.2,
});

document
  .getElementById("linear")!
  .addEventListener("click", () => linearGeneticAlgorithm.startEvolution());

document
  .getElementById("nonLinear")!
  .addEventListener("click", () => nonLinearGeneticAlgorithm.startEvolution());
