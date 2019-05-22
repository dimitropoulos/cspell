import { expect } from 'chai';

import { validateText, hasWordCheck, calcTextInclusionRanges } from './textValidator';
import { createCollection } from './SpellingDictionary';
import { createSpellingDictionary } from './SpellingDictionary';
import { FreqCounter } from './util/FreqCounter';

// cspell:ignore whiteberry redmango lightbrown redberry

describe('Validate textValidator functions', () => {
    test('tests hasWordCheck', async () => {
        // cspell:ignore redgreenblueyellow strawberrymangobanana redwhiteblue
        const dictCol = await getSpellingDictionaryCollection();
        expect(hasWordCheck(dictCol, 'brown', true)).to.be.true;
        expect(hasWordCheck(dictCol, 'white', true)).to.be.true;
        expect(hasWordCheck(dictCol, 'berry', true)).to.be.true;
        // compound words do not cross dictionary boundaries
        expect(hasWordCheck(dictCol, 'whiteberry', true)).to.be.false;
        expect(hasWordCheck(dictCol, 'redmango', true)).to.be.true;
        expect(hasWordCheck(dictCol, 'strawberrymangobanana', true)).to.be.true;
        expect(hasWordCheck(dictCol, 'lightbrown', true)).to.be.true;
        expect(hasWordCheck(dictCol, 'redgreenblueyellow', true)).to.be.true;
        expect(hasWordCheck(dictCol, 'redwhiteblue', true)).to.be.true;
    });

    test('tests textValidator no word compounds', async () => {
        const dictCol = await getSpellingDictionaryCollection();
        const result = validateText(sampleText, dictCol, {});
        const errors = result.map(wo => wo.text).toArray();
        expect(errors).to.deep.equal(['giraffe', 'lightbrown', 'whiteberry', 'redberry']);
    });

    test('tests textValidator with word compounds', async () => {
        const dictCol = await getSpellingDictionaryCollection();
        const result = validateText(sampleText, dictCol, { allowCompoundWords: true });
        const errors = result.map(wo => wo.text).toArray();
        expect(errors).to.deep.equal(['giraffe', 'whiteberry']);
    });

    // cSpell:ignore xxxkxxxx xxxbxxxx
    test(
        'tests ignoring words that consist of a single repeated letter',
        async () => {
            const dictCol = await getSpellingDictionaryCollection();
            const text = ' tttt gggg xxxxxxx jjjjj xxxkxxxx xxxbxxxx \n' + sampleText;
            const result = validateText(text, dictCol, { allowCompoundWords: true });
            const errors = result.map(wo => wo.text).toArray().sort();
            expect(errors).to.deep.equal(['giraffe', 'whiteberry', 'xxxbxxxx', 'xxxkxxxx']);
        }
    );

    test('tests trailing s, ed, ing, etc. are attached to the words', async () => {
        const dictEmpty = await createSpellingDictionary([], 'empty', 'test');
        const text = 'We have PUBLISHed multiple FIXesToThePROBLEMs';
        const result = validateText(text, dictEmpty, { allowCompoundWords: true });
        const errors = result.map(wo => wo.text).toArray();
        expect(errors).to.deep.equal(['have', 'Published', 'multiple', 'Fixes', 'Problems']);
    });

    test('tests trailing s, ed, ing, etc.', async () => {
        const dictWords = await getSpellingDictionaryCollection();
        const text = 'We have PUBLISHed multiple FIXesToThePROBLEMs';
        const result = validateText(text, dictWords, { allowCompoundWords: true });
        const errors = result.map(wo => wo.text).toArray().sort();
        expect(errors).to.deep.equal([]);
    });

    test('test contractions', async () => {
        const dictWords = await getSpellingDictionaryCollection();
        // cspell:disable
        const text = `We should’ve done a better job, but we couldn\\'t have known.`;
        // cspell:enable
        const result = validateText(text, dictWords, { allowCompoundWords: false });
        const errors = result.map(wo => wo.text).toArray().sort();
        expect(errors).to.deep.equal([]);
    });

    test('tests maxDuplicateProblems', async () => {
        const dict = await createSpellingDictionary([], 'empty', 'test');
        const text = sampleText;
        const result = validateText(text, dict, { maxNumberOfProblems: 1000, maxDuplicateProblems: 1 });
        const freq = FreqCounter.create(result.map(t => t.text));
        expect(freq.total).to.be.equal(freq.counters.size);
        const words = freq.counters.keys();
        const dict2 = await createSpellingDictionary(words, 'test', 'test');
        const result2 = [...validateText(text, dict2, { maxNumberOfProblems: 1000, maxDuplicateProblems: 1 })];
        expect(result2.length).to.be.equal(0);
    });

    test('tests inclusion, exclusion', () => {
        const result = calcTextInclusionRanges(sampleText, {});
        expect(result.length).to.be.equal(1);
        expect(result.map(a => [a.startPos, a.endPos])).to.deep.equal([[0, sampleText.length]]);
    });

    test('tests inclusion, exclusion', () => {
        const result = calcTextInclusionRanges(sampleText, { ignoreRegExpList: [/The/g]});
        expect(result.length).to.be.equal(5);
        expect(result.map(a => [a.startPos, a.endPos])).to.deep.equal([
            [0, 5],
            [8, 34],
            [37, 97],
            [100, 142],
            [145, 196],
        ]);
    });

});

async function getSpellingDictionaryCollection() {
    const dicts = await Promise.all([
        createSpellingDictionary(colors, 'colors', 'test'),
        createSpellingDictionary(fruit, 'fruit', 'test'),
        createSpellingDictionary(animals, 'animals', 'test'),
        createSpellingDictionary(insects, 'insects', 'test'),
        createSpellingDictionary(words, 'words', 'test', { repMap: [['’', "'"]]}),
    ]);

    return createCollection(dicts, 'collection');
}

const colors = ['red', 'green', 'blue', 'black', 'white', 'orange', 'purple', 'yellow', 'gray', 'brown', 'light', 'dark'];
const fruit = [
    'apple', 'banana', 'orange', 'pear', 'pineapple', 'mango', 'avocado', 'grape', 'strawberry', 'blueberry', 'blackberry', 'berry', 'red'
];
const animals = ['ape', 'lion', 'tiger', 'Elephant', 'monkey', 'gazelle', 'antelope', 'aardvark', 'hyena'];
const insects = ['ant', 'snail', 'beetle', 'worm', 'stink bug', 'centipede', 'millipede', 'flea', 'fly'];
const words = [
    'the', 'and', 'is', 'has', 'ate', 'light', 'dark', 'little',
    'big', 'we', 'have', 'published', 'multiple', 'fixes', 'to',
    'the', 'problems', 'better', 'done', 'known',
    "shouldn't", "couldn't", "should've",
];

const sampleText = `
    The elephant and giraffe
    The lightbrown worm ate the apple, mango, and, strawberry.
    The little ant ate the big purple grape.
    The orange tiger ate the whiteberry and the redberry.
`;