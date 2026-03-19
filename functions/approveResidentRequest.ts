import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { residentRequestId } = await req.json();

    // Fetch the resident request
    const requests = await base44.entities.ResidentRequest.filter({ id: residentRequestId });
    if (!requests || requests.length === 0) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const request = requests[0];

    // Find or create the block
    const blocks = await base44.entities.Block.filter({ name: request.block_name });
    let blockId;
    if (blocks.length === 0) {
      const newBlock = await base44.entities.Block.create({ name: request.block_name });
      blockId = newBlock.id;
    } else {
      blockId = blocks[0].id;
    }

    // Find or create the apartment
    const apartments = await base44.entities.Apartment.filter({ 
      number: request.apartment_number, 
      block_id: blockId 
    });
    let apartmentId;
    if (apartments.length === 0) {
      const newApt = await base44.entities.Apartment.create({
        number: request.apartment_number,
        block_id: blockId,
        block_name: request.block_name
      });
      apartmentId = newApt.id;
    } else {
      apartmentId = apartments[0].id;
    }

    // Create the resident
    const resident = await base44.entities.Resident.create({
      name: request.name,
      phone: request.phone,
      apartment_id: apartmentId,
      apartment_number: request.apartment_number,
      block_name: request.block_name,
      is_primary: false
    });

    // Update the request status
    await base44.entities.ResidentRequest.update(residentRequestId, {
      status: 'approved',
      resident_id: resident.id,
      approved_at: new Date().toISOString()
    });

    return Response.json({ success: true, resident, block_id: blockId, apartment_id: apartmentId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});