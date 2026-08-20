import type { StructuredDocument } from '@zk-kyc/shared-types';

/**
 * Sample marksheet document template for IIT Bombay CS Department.
 * In a real DigiLocker integration, this JSON would be extracted from
 * a signed PDF by the university's document processing system.
 * Here we issue it directly as mock structured data.
 */
export const MARKSHEET_TEMPLATE: Omit<StructuredDocument, 'id' | 'issuerAddress' | 'issuedAt'> = {
  type: 'MARKSHEET',
  fields: [
    { key: 'studentName', value: 'Arjun Sharma' },
    { key: 'rollNumber', value: 'CS2021001' },
    { key: 'program', value: 'B.Tech Computer Science' },
    { key: 'institution', value: 'IIT Bombay' },
    { key: 'semester', value: 6 },
    { key: 'academicYear', value: '2023-2024' },
    { key: 'cgpa', value: 8.7 },
    { key: 'creditsCompleted', value: 144 },
    { key: 'totalCredits', value: 180 },
    { key: 'passStatus', value: 'PASS' },
  ],
};

/**
 * Sample income certificate document template.
 * In a real DigiLocker integration, this would come from the
 * Income Tax Department / state revenue authority's digital records.
 */
export const INCOME_CERT_TEMPLATE: Omit<StructuredDocument, 'id' | 'issuerAddress' | 'issuedAt'> = {
  type: 'INCOME_CERTIFICATE',
  fields: [
    { key: 'holderName', value: 'Priya Mehta' },
    { key: 'aadhaarSuffix', value: '7823' }, // last 4 digits only — partial PII for demo
    { key: 'financialYear', value: '2023-2024' },
    { key: 'annualIncome', value: 480000 },
    { key: 'incomeTaxPaid', value: 12500 },
    { key: 'incomeCategory', value: 'SALARIED' },
    { key: 'issuingAuthority', value: 'Income Tax Department, India' },
    { key: 'validUntil', value: '2025-03-31' },
  ],
};
