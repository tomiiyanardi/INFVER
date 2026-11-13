import type { ProfileResult } from '../entities/domain.js';
import type { InvestmentRepository } from '../repositories/contracts.js';
import { AppError } from './errors.js';
export class ProfileService {
  constructor(private readonly repository: InvestmentRepository) {}
  async questions() {
    return (await this.repository.getQuestions()).map(question => ({ ...question, options: question.options.map(({ id, label }) => ({ id, label })) }));
  }
  async evaluate(answers: { questionId: string; optionId: string }[]): Promise<ProfileResult> {
    const questions = await this.repository.getQuestions();
    if (answers.length !== questions.length || new Set(answers.map(answer => answer.questionId)).size !== questions.length) {
      throw new AppError(422, 'INVALID_ANSWERS', 'Respondé cada pregunta exactamente una vez.');
    }
    let score = 0;
    for (const question of questions) {
      const answer = answers.find(item => item.questionId === question.id);
      const option = question.options.find(item => item.id === answer?.optionId);
      if (!option) throw new AppError(422, 'INVALID_OPTION', 'Una respuesta no corresponde al cuestionario.');
      score += option.score;
    }
    const maxScore = questions.reduce((total, question) => total + Math.max(...question.options.map(option => option.score)), 0);
    const ratio = score / maxScore;
    let profile: ProfileResult['profile'] = ratio <= 1 / 3 ? 'conservative' : ratio <= 2 / 3 ? 'moderate' : 'aggressive';
    // La capacidad de afrontar pérdidas limita el apetito de riesgo declarado.
    const horizon = answers.find(answer => answer.questionId === 'horizon');
    const liquidity = answers.find(answer => answer.questionId === 'liquidity');
    const emergency = answers.find(answer => answer.questionId === 'emergency');
    if (horizon?.optionId === 'low' || liquidity?.optionId === 'low' || emergency?.optionId === 'low') profile = 'conservative';
    const policy = await this.repository.getPolicy(profile);
    return { profile, name: policy.name, score, maxScore, description: policy.description };
  }
}
