import { generate } from "./npcData/generate";
import { Client } from "@notionhq/client";
import {
    Block,
    HeadingThreeBlock,
    InputPropertyValue,
    ParagraphBlock,
} from "@notionhq/client/build/src/api-types";
import { Npc } from "./npcData";
import { InputPropertyValueMap } from "@notionhq/client/build/src/api-endpoints";

const NOTION_API_KEY = process.env.NOTION_API_KEY || "";
const DATABASE_ID = process.env.DATABASE_ID || "";
const GENERATE_MINIMUM = 1;
const GENERATE_MAXIMUM = 10;

const generateNpc = (): Npc => {
    const npc = generate().npc;

    if (
        npc.description.race === "lizardman" ||
        npc.description.race === "lizardwoman"
    ) {
        npc.ptraits.traits1 = npc.ptraits.traitslizards;
    }
    if (npc.description.race === "goliath") {
        npc.ptraits.traits1 = npc.ptraits.traitsgoliaths;
    }
    if (npc.description.race === "kenku") {
        npc.description.name = npc.description.kenkuname;
    }

    return npc;
};

const toFeet = (n: number): string => {
    const realFeet = (n * 0.3937) / 12;
    const feet = Math.floor(realFeet);
    const inches = Math.floor((realFeet - feet) * 12);
    return feet + "'" + inches + '"';
};

const renderAbility = (abilityBase: number): string => {
    const ability = Math.max(3, abilityBase);
    // Info on modifiers
    // https://dnd5e.info/using-ability-scores/ability-scores-and-modifiers/
    const modifier = Math.floor((ability - 10) / 2);
    return `${ability} [${modifier <= 0 ? modifier : `+${modifier}`}]`;
};

const getNpcDescription = (npc: Npc): string[] => {
    let descriptions = [
        `${npc.description.name} is a ${npc.description.age} year old ${npc.description.gender} ${npc.description.race} ${npc.description.occupation}.`,
        `${npc.description.pronounCapit}has ${npc.physical.hair}${npc.physical.eyes}.`,
        `${npc.description.pronounCapit}has ${npc.physical.skin}.`,
        `${npc.description.pronounCapit}stands ${
            npc.physical.height
        }cm (${toFeet(npc.physical.height)}) tall and has ${
            npc.physical.build
        }.`,
        `${npc.description.pronounCapit}has ${npc.physical.face}.`,
    ];

    if (npc.physical.special1 !== "") {
        descriptions.push(npc.physical.special1);
    }
    if (npc.physical.special2 !== "") {
        descriptions.push(npc.physical.special2);
    }

    return descriptions;
};

const getNpcPersonalityTraits = (npc: Npc): string[] => {
    let personalityTraits = [
        npc.religion.description,
        npc.ptraits.traits1,
        npc.ptraits.traits2,
    ];

    var pquirks = npc.pquirks.description.match(/[^\.!\?]+[\.!\?]+/g)!;

    return [...personalityTraits, ...pquirks].map((personalityTrait) =>
        personalityTrait.trim()
    );
};

const getNpcAbilityScores = (npc: Npc): string[] => {
    return Object.entries(npc.abilities).map(
        ([key, value]) => `${key.toUpperCase()} - ${renderAbility(value)}`
    );
};

const getNpcRelationships = (npc: Npc): string[] => {
    return [
        `Sexual Orientation - ${npc.relationship.orientation}`,
        `Relationship Status - ${npc.relationship.status}`,
    ];
};

const getNpcAlignments = (npc: Npc): string[] => {
    return [
        `Good - ${npc.alignment.good}`,
        `Neutral - ${npc.alignment.moralneutral}`,
        `Evil - ${npc.alignment.evil}`,
        `Lawful - ${npc.alignment.lawful}`,
        `Neutral - ${npc.alignment.ethicalneutral}`,
        `Chaotic - ${npc.alignment.chaotic}`,
    ];
};

const getNpcPageProperties = (npc: Npc): InputPropertyValueMap => {
    return {
        Name: {
            title: [
                {
                    type: "text",
                    text: {
                        content: npc.description.name,
                    },
                },
            ],
        } as InputPropertyValue,
        Generated: {
            checkbox: true,
        } as InputPropertyValue,
    };
};

const getHeaderThreeBlock = (string: string): HeadingThreeBlock => {
    return {
        object: "block",
        type: "heading_3",
        heading_3: {
            text: [
                {
                    type: "text",
                    text: {
                        content: string,
                    },
                },
            ],
        },
    } as HeadingThreeBlock;
};

const getParagraphBlock = (string: string): ParagraphBlock => {
    return {
        object: "block",
        type: "paragraph",
        paragraph: {
            text: [
                {
                    type: "text",
                    text: {
                        content: string,
                    },
                },
            ],
        },
    } as ParagraphBlock;
};

const getNpcPageChildren = (npc: Npc): Block[] => {
    const children: Block[] = [];

    children.push(getHeaderThreeBlock("Description"));
    getNpcDescription(npc).forEach((description) => {
        children.push(getParagraphBlock(description));
    });

    children.push(getHeaderThreeBlock("Personality Traits"));
    getNpcPersonalityTraits(npc).forEach((personalityTrait) => {
        children.push(getParagraphBlock(personalityTrait));
    });

    children.push(getHeaderThreeBlock("Ability Scores"));
    getNpcAbilityScores(npc).forEach((abilityScore) => {
        children.push(getParagraphBlock(abilityScore));
    });

    children.push(getHeaderThreeBlock("Relationships"));
    getNpcRelationships(npc).forEach((relationship) => {
        children.push(getParagraphBlock(relationship));
    });

    children.push(getHeaderThreeBlock("Alignment Tendencies"));
    getNpcAlignments(npc).forEach((alignment) => {
        children.push(getParagraphBlock(alignment));
    });

    children.push(getHeaderThreeBlock("Plot Hook"));
    children.push(getParagraphBlock(npc.hook.description));

    return children;
};

const saveToNotion = (npc: Npc): void => {
    const notion = new Client({ auth: NOTION_API_KEY });

    notion.pages
        .create({
            parent: {
                database_id: DATABASE_ID,
            },
            properties: getNpcPageProperties(npc),
            children: getNpcPageChildren(npc),
        })
        .then((_) =>
            console.log(
                `NPC: ${npc.description.name} ${npc.description.gender} ${npc.description.race} ${npc.description.occupation}`
            )
        )
        .catch(console.error);
};

const createNpc = () => {
    let count = GENERATE_MINIMUM;

    if (process.argv.length > 2) {
        count = Math.max(
            GENERATE_MINIMUM,
            Math.min(GENERATE_MAXIMUM, Number(process.argv[2]))
        );
    }

    Array.from({ length: count }, () => {
        saveToNotion(generateNpc());
    });
};

createNpc();
