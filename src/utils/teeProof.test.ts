import { decodeTeeProof, checkPoeAgainstEnvelope } from './teeProof';

const SAMPLE_PROOF =
  '0x0000000000000000000000000000000000000000000000000000000000000020e68df4418377fc7697d0bb6ed21558f39397e98ce120172aef1d463bcc557b754f8b4b92e1df834cdea38c9cd8788361dd3f947edf9044cb508e19653dc11c5d0000000000000000000000000000000000000000000000000000000000a2842d00000000000000000000000000000000000000000000000000000000699e6a5a40ed09f5419a52b36acbdcf146f7a08404275203e04c4ad827a18684ff9250da000000000000000000000000000000000000000000000000000000000000001700000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004111ef08768559b3baab069db068d1d34161be33ba15799092da36d74c72a5599079206457a31e090c9d2d2f9131822b9fc556d5255bba4b540eda8db7bd90aad81b00000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

const SAMPLE_ENVELOPE = {
  stateRoot: '0x40ed09f5419a52b36acbdcf146f7a08404275203e04c4ad827a18684ff9250da' as `0x${string}`,
  header: {
    hash: '0x4f8b4b92e1df834cdea38c9cd8788361dd3f947edf9044cb508e19653dc11c5d' as `0x${string}`,
    number: 10650669,
    parentHash: '0xe68df4418377fc7697d0bb6ed21558f39397e98ce120172aef1d463bcc557b75' as `0x${string}`,
    timestamp: 1771989594,
  },
};

describe('decodeTeeProof', () => {
  it('decodes the sample SignedPoe payload', () => {
    const signed = decodeTeeProof(SAMPLE_PROOF);

    expect(signed.poe.parentHash).toBe(
      '0xe68df4418377fc7697d0bb6ed21558f39397e98ce120172aef1d463bcc557b75',
    );
    expect(signed.poe.blockHash).toBe(
      '0x4f8b4b92e1df834cdea38c9cd8788361dd3f947edf9044cb508e19653dc11c5d',
    );
    expect(signed.poe.blockNumber).toBe(10650669n);
    expect(signed.poe.timestamp).toBe(1771989594n);
    expect(signed.poe.stateRoot).toBe(
      '0x40ed09f5419a52b36acbdcf146f7a08404275203e04c4ad827a18684ff9250da',
    );
    expect(signed.id).toBe(23n);
    expect(signed.signature).toBe(
      '0x11ef08768559b3baab069db068d1d34161be33ba15799092da36d74c72a5599079206457a31e090c9d2d2f9131822b9fc556d5255bba4b540eda8db7bd90aad81b',
    );
  });
});

describe('checkPoeAgainstEnvelope', () => {
  it('reports ok when all fields match', () => {
    const signed = decodeTeeProof(SAMPLE_PROOF);
    const result = checkPoeAgainstEnvelope(signed, SAMPLE_ENVELOPE);
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  it('reports every mismatching field', () => {
    const signed = decodeTeeProof(SAMPLE_PROOF);
    const bad = {
      stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      header: {
        ...SAMPLE_ENVELOPE.header,
        number: 1,
        timestamp: 0,
      },
    };
    const result = checkPoeAgainstEnvelope(signed, bad);
    expect(result.ok).toBe(false);
    expect(result.mismatches.length).toBe(3);
    expect(result.mismatches.some(m => m.startsWith('blockNumber'))).toBe(true);
    expect(result.mismatches.some(m => m.startsWith('timestamp'))).toBe(true);
    expect(result.mismatches.some(m => m.startsWith('stateRoot'))).toBe(true);
  });
});
