import StrategyVaultAbi from "@/abi/StrategyVault.json";
import DecisionLogAbi from "@/abi/DecisionLog.json";
import IdentityRegistryAbi from "@/abi/IdentityRegistry.json";
import ReputationRegistryAbi from "@/abi/ReputationRegistry.json";

export const Atlas = {
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`,
  decisionLog: process.env.NEXT_PUBLIC_DECISION_LOG_ADDRESS as `0x${string}`,
  identity: process.env.NEXT_PUBLIC_IDENTITY_ADDRESS as `0x${string}`,
  reputation: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as `0x${string}`,
  base: process.env.NEXT_PUBLIC_BASE_ASSET as `0x${string}`,
};

export const abi = {
  vault: StrategyVaultAbi,
  decisionLog: DecisionLogAbi,
  identity: IdentityRegistryAbi,
  reputation: ReputationRegistryAbi,
};
