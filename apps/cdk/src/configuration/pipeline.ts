import { AwsRegion } from "../model/region";
import type { Stack } from "../model/stack";
import { Stage } from "../model/stage";
import { AWS_ACCOUNT_ID } from "./application";

export interface StageEnvironment {
    accountId: string;
    region: AwsRegion;
    stage: Stage;
    stacks: Stack[];
}

export const PIPELINE_STAGES: Partial<Record<Stage, StageEnvironment>> = {
    [Stage.BETA]: {
        accountId: AWS_ACCOUNT_ID,
        region: AwsRegion.US_EAST_1,
        stage: Stage.BETA,
        stacks: [],
    },
    [Stage.PROD]: {
        accountId: AWS_ACCOUNT_ID,
        region: AwsRegion.US_EAST_1,
        stage: Stage.PROD,
        stacks: [],
    },
};
