'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface TaxInfoField {
  label: string
  labelTh: string
  valueEn: string
  valueTh: string
}

const taxInfo: TaxInfoField[] = [
  {
    label: 'Company Name',
    labelTh: 'ชื่อบริษัท',
    valueEn: 'PassionSeed Company Limited',
    valueTh: 'บริษัท แพชชั่นซี้ด จํากัด'
  },
  {
    label: 'Tax ID Number',
    labelTh: 'หมายเลขประจำตัวผู้เสียภาษี',
    valueEn: '0835568012167',
    valueTh: '0835568012167'
  },
  {
    label: 'Email for E-TAX Invoice',
    labelTh: 'อีเมลสำหรับใบกำกับภาษีอิเล็กทรอนิกส์',
    valueEn: 'seedpassion@gmail.com',
    valueTh: 'seedpassion@gmail.com'
  },
  {
    label: 'Business Address',
    labelTh: 'ที่อยู่ธุรกิจ',
    valueEn: '135/4 Patak Street Karon Phuket 83100',
    valueTh: '135/4 ถนนปฏัก ตําบลกะรน อําเภอเมืองภูเก็ต จังหวัดภูเก็ต 83100'
  }
]

export default function TaxInvoicePage() {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, fieldLabel: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldLabel)
      toast.success('Copied!')
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  const TaxSection = ({ isEnglish }: { isEnglish: boolean }) => (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-light text-center mb-12">
        {isEnglish ? 'Tax Invoice Information' : 'ข้อมูลใบกำกับภาษี'}
      </h1>
      
      {taxInfo.map((field, index) => (
        <div key={index} className="space-y-3">
          <h3 className="text-sm uppercase tracking-wide text-gray-400">
            {isEnglish ? field.label : field.labelTh}
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-lg">{isEnglish ? field.valueEn : field.valueTh}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(isEnglish ? field.valueEn : field.valueTh, `${field.label}-${isEnglish ? 'en' : 'th'}`)}
              className="text-purple-400 hover:text-purple-400 hover:bg-white/5 ml-4"
            >
              {copiedField === `${field.label}-${isEnglish ? 'en' : 'th'}` ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="border-b border-white/10"></div>
        </div>
      ))}
    </div>
  )

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)",
      }}
    >
      <div className="container mx-auto px-6 py-20">
        <TaxSection isEnglish={true} />
        
        <div className="my-20">
          <div className="border-t border-white/10 w-24 mx-auto"></div>
        </div>
        
        <TaxSection isEnglish={false} />
      </div>
    </div>
  )
}