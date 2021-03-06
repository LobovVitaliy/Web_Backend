/**
 * Creates DynamoDB tables in local db by inspecting declarative PULUMI infrastructure
 */


process.env.PULUMI_TEST_MODE = 'true';
process.env.PULUMI_NODEJS_STACK = 'my-ws';
process.env.PULUMI_NODEJS_PROJECT = 'dev';
process.env.PULUMI_CONFIG = '{ "aws:region": "us-west-2" }';

import '../configTestEnvironment'
import * as dynamoStructure from '../../infrastructure/dynamodb'
import { Table } from '@pulumi/aws/dynamodb'
import * as AWS from 'aws-sdk'
import * as pulumi from "@pulumi/pulumi";

const promise = <T>(out: pulumi.Output<T>): Promise<pulumi.Unwrap<T>> => {
    let anyOut: any = out
    return anyOut.promise()
}

function toKeySchema(hashKey: string | undefined, rangeKey: string | undefined) {
    const keys = []
    if(hashKey) {
        keys.push({AttributeName: hashKey, KeyType: "HASH"})
    }
    if(rangeKey) {
        keys.push({AttributeName: rangeKey, KeyType: "RANGE"})
    }

    return keys
}

const tables = Object.values(dynamoStructure).filter(c => c instanceof Table).map(c => <Table>c)
const dynamodb = new AWS.DynamoDB();
for (const table of tables) {
    Promise.all(
        [promise(table.hashKey), promise(table.rangeKey), promise(table.name),
        promise(table.attributes), promise(table.globalSecondaryIndexes), promise(table.localSecondaryIndexes)]
    )
        .then((a) => {
            const [hashKey, rangeKey, name, attributes, globalSecondaryIndexes, localSecondaryIndexes] = a
            const keys = toKeySchema(hashKey, rangeKey);

            const gsi: AWS.DynamoDB.GlobalSecondaryIndexList = [];
            if (globalSecondaryIndexes) {
                for (let i of globalSecondaryIndexes) {
                    gsi.push({
                        IndexName: i.name,
                        KeySchema: toKeySchema(i.hashKey, i.rangeKey),
                        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
                        Projection: { ProjectionType: i.projectionType, NonKeyAttributes: i.nonKeyAttributes }
                    })
                }
            }

            const lsi: AWS.DynamoDB.LocalSecondaryIndexList = [];
            if (localSecondaryIndexes) {
                for (let i of localSecondaryIndexes) {
                    lsi.push({ 
                        IndexName: i.name, 
                        KeySchema: toKeySchema(hashKey, i.rangeKey),
                        Projection: { ProjectionType: i.projectionType, NonKeyAttributes: i.nonKeyAttributes }
                    })
                }
            }


            let dynamoAttributes: AWS.DynamoDB.AttributeDefinitions = []
            if(attributes) {
                dynamoAttributes = attributes.map(e => ({
                    AttributeName: e.name,
                    AttributeType: e.type
                }))
            }

            dynamodb.createTable({
                AttributeDefinitions: dynamoAttributes,
                TableName: name || 'default',
                KeySchema: keys,
                ProvisionedThroughput: {
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1
                },
                GlobalSecondaryIndexes: gsi.length ? gsi : undefined,
                LocalSecondaryIndexes: lsi.length ? lsi : undefined
            }, (err, data) => {if(err) console.error(err); else console.log('Created: ', data)})
        })
}