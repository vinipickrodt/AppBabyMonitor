import { BabyLogService } from "../services/BabyLogService.js";
import { LocalStorageBabyLogRepository } from "../services/storage/LocalStorageBabyLogRepository.js";

export function createAppContainer() {
  const repository = new LocalStorageBabyLogRepository(window.localStorage);
  const babyLogService = new BabyLogService(repository);

  return {
    babyLogService
  };
}
